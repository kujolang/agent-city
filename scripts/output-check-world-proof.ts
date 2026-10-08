import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(process.env.CITY_PROOF_RUNTIME || "");
assert(runtime.startsWith(resolve(root, ".runtime/profile-code-")));
assert(
  (await readFile(resolve(runtime, "control/jobs.json"), "utf8")).includes(
    "mission-",
  ),
);
const out = resolve(root, "evidence/mission-workcell/output-check-real/world");
await mkdir(runtime, { recursive: true, mode: 0o700 });
await mkdir(out, { recursive: true });
for (const port of [18991, 18992, 18888])
  assert(await portAvailable(port), "Occupied proof port " + port);
const token = randomBytes(32).toString("hex");
await writeFile(resolve(runtime, "token"), token, { mode: 0o600 });
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ schema_version: "watchdog.exporters.v1", exporters: [] }),
);
const kujo = resolve(root, "../kujo/target/release/kujo");
const producer = "profile-code-";
const children: ChildProcess[] = [];
const logs: string[] = [];
const common = {
  ...process.env,
  KUJO_BIN: kujo,
  CITY_RUNTIME_DIR: runtime,
  CITY_SOURCE_PREFIX: producer,
  WATCHDOG_URL: "http://127.0.0.1:18991",
};
function launch(
  cmd: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
) {
  const c = spawn(cmd, args, {
    cwd,
    env: { ...common, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(c);
  c.stdout?.on("data", (d) => {
    logs.push(String(d));
    if (logs.length > 100) logs.shift();
  });
  c.stderr?.on("data", (d) => {
    logs.push(String(d));
    if (logs.length > 100) logs.shift();
  });
  return c;
}
async function ready(url: string) {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Service unavailable " + url);
}
let browser;
const startWatchdog = () =>
  launch(
    kujo,
    ["run", "--interpreter", "dashboard_server.kujo"],
    resolve(root, "../watchdog"),
    {
      WDG_HOST: "127.0.0.1",
      WDG_PORT: "18991",
      WDG_DB_PATH: resolve(runtime, "watchdog.sqlite"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: randomBytes(32).toString("hex"),
      WDG_UPSTREAM_BASE_URL: "http://127.0.0.1:1",
      WDG_BACKUP_ENABLED: "false",
      WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
    },
  );

try {
  let watchdog = startWatchdog();
  await ready("http://127.0.0.1:18991/healthz");
  launch(
    process.execPath,
    ["--import", "tsx", "integrations/kujo/bridge.ts"],
    root,
  );
  let gateway = launch(
    process.execPath,
    ["--import", "tsx", "apps/gateway/main.ts"],
    root,
    {
      CITY_PORT: "18992",
      CITY_DB: resolve(runtime, "city.sqlite"),
    },
  );
  await ready("http://127.0.0.1:18992/api/world/snapshot");
  launch(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "apps/web", "--port", "18888"],
    root,
    {
      CITY_GATEWAY_URL: "http://127.0.0.1:18992",
      CITY_CONTROL_URL: "http://127.0.0.1:1",
    },
  );
  await ready("http://127.0.0.1:18888");
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:18888");
  await page.waitForSelector("canvas");

  const timeline: any[] = [];
  const visits = new Set<string>();
  let selected = "";
  let finalTruth: any;
  const end = Date.now() + 540000;
  while (Date.now() < end) {
    const view = await page.evaluate(() => {
      const c = (window as any).agentCity;
      return {
        truth: c.truth,
        walkers: c.presentation.walkers,
        scene: c.scene,
        follow: c.follow,
      };
    });
    const agents = Object.values(view.truth.agents) as any[];
    const operations = agents.flatMap(
      (a) => Object.values(a.operations) as any[],
    );
    const checks = operations.filter(
      (o) => o.metadata?.tool === "city.output-check",
    );
    const checker = agents.findLast((a) => a.profile === "city-kujo-checker");
    const target = checker || agents[0];
    if (target && target.id !== selected) {
      await page.getByTitle(target.id, { exact: true }).click();
      selected = target.id;
    }
    if (selected && view.follow === selected) {
      const walker = view.walkers[selected];
      const key = selected + ":" + view.scene + ":" + walker?.phase;
      if (!visits.has(key)) {
        visits.add(key);
        timeline.push({
          instance: selected,
          scene: view.scene,
          phase: walker?.phase,
          order: view.truth.order,
        });
        if (["dojo", "mcp", "workshop"].includes(view.scene))
          await page.locator(".world").screenshot({
            path: resolve(out, "visit-" + timeline.length + ".png"),
          });
      }
    }
    finalTruth = view.truth;
    if (
      checks.some((o) => o.status === "failed") &&
      checks.some((o) => o.status === "succeeded") &&
      timeline.some((t) => t.scene === "dojo")
    )
      break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const operations = (Object.values(finalTruth.agents) as any[]).flatMap(
    (a) => Object.values(a.operations) as any[],
  );
  const checks = operations.filter(
    (o) => o.metadata?.tool === "city.output-check",
  );
  const proof = {
    scope:
      "Real lifecycle spools attached while source mission is active; Watchdog canonical ingestion, gateway and Pixi. Late observations may be RECENT. No source rerun.",
    checks,
    timeline,
    truth: finalTruth,
    errors,
  };
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  assert(checks.some((o) => o.status === "failed"));
  assert(checks.some((o) => o.status === "succeeded"));
  assert(timeline.some((t) => t.scene === "dojo"));
  assert.deepEqual(errors, []);
  console.log("Observed real output failure/pass and Follow into Dojo: PASS");
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill("SIGTERM");
    await new Promise<void>((r) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        r();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        r();
      });
    });
  }
}
