import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile, open } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";

// Explicit real-model proof. No fixture provider and no execution of generated code.
const root = resolve(import.meta.dirname, "..");
const prefix = `live-${Date.now()}-`;
const runtime = resolve(root, ".runtime", prefix);
const out = resolve(root, "evidence/live-missions", prefix);
const origin = "http://127.0.0.1:18890";
const kujo = resolve(root, "../kujo/target/release/kujo");
const model = "qwen2.5-coder:1.5b-instruct";
const children: ChildProcess[] = [];
await mkdir(runtime, { recursive: true, mode: 0o700 });
await mkdir(out, { recursive: true });
const token = randomBytes(32).toString("hex");
await writeFile(resolve(runtime, "token"), token, { mode: 0o600 });
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ exporters: [] }),
);
const common = {
  ...process.env,
  KUJO_BIN: kujo,
  CITY_RUNTIME_DIR: runtime,
  CITY_SOURCE_PREFIX: prefix,
  CITY_WEB_ORIGIN: origin,
  WATCHDOG_URL: "http://127.0.0.1:19091",
  RAG_URL: "http://127.0.0.1:19095",
};
async function launch(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env = {},
) {
  const log = await open(resolve(runtime, name + ".log"), "w", 0o600);
  const child = spawn(command, args, {
    cwd,
    env: { ...common, ...env },
    stdio: ["ignore", log.fd, log.fd],
  });
  children.push(child);
  await log.close();
  return child;
}
async function until<T>(
  fn: () => Promise<T>,
  ok: (v: T) => boolean,
  ms = 30000,
) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (ok(v)) return v;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Live proof condition timed out");
}
const ready = (url: string) =>
  until(async () => (await fetch(url)).ok, Boolean);
let browser;
const receipts: unknown[] = [];
try {
  const tags = await (await fetch("http://127.0.0.1:11434/api/tags")).json();
  const installed = tags.models.find((m: any) => m.name === model);
  assert(installed, "Install the explicitly selected local model first");
  const ragEnv = { KUJO_RAG_INDEX_PATH: resolve(runtime, "rag.json") };
  const ingest = await launch(
    "ingest",
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "ingest",
      "--path",
      "./examples/kujo_docs",
      "--recursive",
      "true",
      "--namespace",
      "agent-city",
    ],
    resolve(root, "../rag"),
    ragEnv,
  );
  assert.equal(await new Promise((r) => ingest.once("exit", r)), 0);
  await launch(
    "rag",
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      "19095",
    ],
    resolve(root, "../rag"),
    ragEnv,
  );
  await ready("http://127.0.0.1:19095/health");
  await launch(
    "watchdog",
    kujo,
    ["run", "dashboard_server.kujo", "--interpreter"],
    resolve(root, "../watchdog"),
    {
      WDG_PORT: "19091",
      WDG_DB_PATH: resolve(runtime, "watchdog.sqlite"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: token,
      WDG_BACKUP_ENABLED: "false",
      WDG_UPSTREAM_BASE_URL: "http://127.0.0.1:1",
      WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
    },
  );
  await ready("http://127.0.0.1:19091/readyz");
  await launch(
    "gateway",
    process.execPath,
    ["--import", "tsx", "apps/gateway/main.ts"],
    root,
    { CITY_PORT: "19092", CITY_DB: resolve(runtime, "city.sqlite") },
  );
  await launch(
    "bridge",
    process.execPath,
    ["--import", "tsx", "integrations/kujo/bridge.ts"],
    root,
  );
  await launch(
    "runner",
    process.execPath,
    ["--import", "tsx", "apps/runner/main.ts"],
    root,
    {
      CITY_CONTROL_PORT: "19093",
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MODEL: model,
      CITY_MODEL_ENDPOINT: "http://127.0.0.1:11434/v1/chat/completions",
      CITY_MODEL_API_KEY: "",
    },
  );
  await ready("http://127.0.0.1:19093/control/status");
  await ready("http://127.0.0.1:19092/api/world/snapshot");
  await launch(
    "web",
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "apps/web",
      "--host",
      "127.0.0.1",
      "--port",
      "18890",
    ],
    root,
    {
      CITY_GATEWAY_URL: "http://127.0.0.1:19092",
      CITY_CONTROL_URL: "http://127.0.0.1:19093",
    },
  );
  await ready(origin);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 1360, height: 1100 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.waitForSelector("canvas");
  for (const [kind, prompt] of [
    [
      "writing",
      "Using the supplied local Kujo docs, write a short 60-word explanation of module imports. Do not invent syntax.",
    ],
    [
      "code",
      "Write a self-contained JavaScript module exporting function sum(values) that sums an array of finite numbers and throws TypeError for invalid input. No imports. Keep it short.",
    ],
  ]) {
    await page.getByLabel("Task type").selectOption(kind);
    await page
      .getByLabel("Use indexed local Kujo docs")
      .setChecked(kind === "writing");
    await page.getByLabel("Task", { exact: true }).fill(prompt);
    await page.waitForFunction(
      () =>
        !(document.querySelector("#mission-form button") as HTMLButtonElement)
          .disabled,
    );
    await page
      .getByRole("button", { name: "Start mission", exact: true })
      .click();
    const status = () =>
      fetch("http://127.0.0.1:19093/control/status").then((r) => r.json());
    const accepted = await until(status, (s) => s.jobs[0]?.kind === kind);
    const job = accepted.jobs[0];
    const track: any[] = [];
    let selected = false;
    const seen = new Set<string>();
    await until(
      async () => {
        const state = await page.evaluate(() => (window as any).agentCity);
        const actor: any = Object.values(state.truth.agents).find(
          (a: any) =>
            a.id.includes(job.id) &&
            a.profile === `city-${kind === "code" ? "coder" : "writer"}`,
        );
        if (actor && !selected) {
          await page
            .locator("#roster button")
            .filter({ hasText: kind === "code" ? "CODER" : "WRITER" })
            .first()
            .click();
          await page.locator("#follow").click();
          selected = true;
        }
        if (actor) {
          const walker = state.presentation.walkers[actor.id];
          const key = `${state.scene}:${walker?.phase}:${actor.status}`;
          if (!seen.has(key)) {
            seen.add(key);
            track.push({
              key,
              id: actor.id,
              walker,
              truth: actor.status,
              at: Date.now(),
            });
            await page.screenshot({
              path: resolve(out, `${kind}-${track.length}.png`),
            });
          }
        }
        return status();
      },
      (s) =>
        ["completed", "failed"].includes(
          s.jobs.find((j: any) => j.id === job.id)?.status,
        ),
      250000,
    );
    const terminal = (await status()).jobs.find((j: any) => j.id === job.id);
    await page.waitForTimeout(8000);
    const artifact = await (
      await fetch(`http://127.0.0.1:19093/control/artifact/${job.id}`)
    ).json();
    const exchanges = await (
      await fetch(`http://127.0.0.1:19093/control/exchanges/${job.id}`)
    ).json();
    const spool = (
      await readFile(resolve(runtime, `spool-${prefix}${job.id}.jsonl`), "utf8")
    )
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s));
    const receipt = {
      job: terminal,
      track,
      artifact,
      exchanges,
      lifecycle: spool,
    };
    receipts.push(receipt);
    await writeFile(
      resolve(out, `${kind}.json`),
      JSON.stringify(receipt, null, 2),
    );
    assert.equal(terminal.status, "completed", `${kind} mission failed`);
    assert.equal(exchanges.records.length, 2);
    assert(
      spool.some((e) => e.agent_id === "reviewer" && e.phase === "finished"),
    );
    assert(
      !JSON.stringify(spool).includes(prompt),
      "Raw task leaked into lifecycle metadata",
    );
    console.log(
      `${kind}: real model + Dispatch + SDK reviewer completed / ${job.id}`,
    );
  }
  const state = await page.evaluate(() => (window as any).agentCity);
  assert(Object.keys(state.truth.agents).length >= 4);
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: resolve(out, "completed.png"),
    fullPage: true,
  });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: "REAL LOCAL MODEL PRODUCT PROOF",
        at: new Date().toISOString(),
        model: installed,
        browser: browser.version(),
        errors,
        instances: Object.keys(state.truth.agents),
        truth: state.truth,
        jobs: receipts.length,
        codeExecuted: false,
      },
      null,
      2,
    ),
  );
  console.log(`Live proof saved: ${out}`);
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill("SIGTERM");
}
