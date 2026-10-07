import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/workcell-live-" + Date.now());
const watchdogOutage = process.env.CITY_PROOF_WATCHDOG_OUTAGE === "1";
const outage = process.env.CITY_PROOF_GATEWAY_OUTAGE === "1" || watchdogOutage;
const out = resolve(
  root,
  "evidence/mission-workcell",
  watchdogOutage ? "watchdog-outage" : outage ? "gateway-outage" : "live-world",
);
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
const producer = "review-workcell-live-" + Date.now();
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
  let observerStoppedAt: string | null = null;
  let sourceFinishedAt: string | null = null;
  let observerRestartedAt: string | null = null;
  if (outage) {
    await page.waitForFunction(
      () => (window as any).agentCity.health === "LIVE",
      undefined,
      { timeout: 30000 },
    );
    const stopped = new Promise<void>((done) =>
      (watchdogOutage ? watchdog : gateway).once("exit", () => done()),
    );
    (watchdogOutage ? watchdog : gateway).kill("SIGTERM");
    await Promise.race([
      stopped,
      new Promise((_, fail) =>
        setTimeout(() => fail(Error("Observer stop timeout")), 5000),
      ),
    ]);
    assert(
      (watchdogOutage ? watchdog : gateway).exitCode !== null ||
        (watchdogOutage ? watchdog : gateway).signalCode !== null,
    );
    observerStoppedAt = new Date().toISOString();
    await page.waitForFunction(
      () => (window as any).agentCity.health === "STALE",
    );
  }
  const worker = launch(
    process.execPath,
    ["--import", "tsx", "integrations/kujo/workcell.ts"],
    root,
    {
      CITY_PRODUCER: producer,
      CITY_RUN: producer + "-run",
      CITY_WORKCELL_IMAGE:
        process.env.CITY_WORKCELL_IMAGE ||
        "kujolang/workcell-kujo:tribunal-kujo-1.5.0-cc2d7db",
      CITY_WORKCELL_KUJO_FILE: resolve(
        root,
        "evidence/profile-kujo/real/reviewed.kujo",
      ),
    },
  );
  const completion = new Promise<number | null>((ok, fail) => {
    worker.once("exit", ok);
    worker.once("error", fail);
  });
  if (outage) {
    assert.equal(await completion, 0);
    sourceFinishedAt = new Date().toISOString();
    assert(
      (watchdogOutage ? watchdog : gateway).exitCode !== null ||
        (watchdogOutage ? watchdog : gateway).signalCode !== null,
    );
    if (watchdogOutage) {
      const spool = await readFile(
        resolve(runtime, "spool-" + producer + ".jsonl"),
        "utf8",
      );
      assert(
        spool.includes('"phase":"finished"'),
        "Completion must be durable before observer recovery",
      );
      watchdog = startWatchdog();
      await ready("http://127.0.0.1:18991/healthz");
    } else {
      gateway = launch(
        process.execPath,
        ["--import", "tsx", "apps/gateway/main.ts"],
        root,
        {
          CITY_PORT: "18992",
          CITY_DB: resolve(runtime, "city.sqlite"),
        },
      );
      await ready("http://127.0.0.1:18992/api/world/snapshot");
    }
    observerRestartedAt = new Date().toISOString();
  }
  await page.waitForFunction(
    () => Object.keys((window as any).agentCity.truth.agents).length > 0,
    undefined,
    { timeout: 90000 },
  );
  const id = await page.evaluate(
    () => Object.keys((window as any).agentCity.truth.agents)[0],
  );
  let atBay: any = null;
  if (!outage) {
    await page.locator("#roster button").first().click();

    await page.waitForFunction(
      (id) => {
        const c = (window as any).agentCity,
          w = c.presentation.walkers[id];
        return (
          c.follow === id &&
          c.scene === "workshop" &&
          w?.phase === "read" &&
          w.y === 96
        );
      },
      id,
      { timeout: 60000 },
    );
    await page
      .locator(".world")
      .screenshot({ path: resolve(out, "workcell-bay.png") });
    atBay = await page.evaluate((id) => {
      const c = (window as any).agentCity,
        w = c.presentation.walkers[id];
      return {
        instance: w.id,
        scene: c.scene,
        follow: c.follow,
        x: w.x,
        y: w.y,
        phase: w.phase,
        visual: document.querySelector("#visual")?.textContent,
        truth: c.truth.agents[id],
      };
    }, id);
  }
  assert.equal(await completion, 0);
  await page.waitForFunction(
    (id) =>
      Object.values(
        (window as any).agentCity.truth.agents[id].operations,
      ).filter((o: any) => o.capability === "artifact.created").length === 2,
    id,
    { timeout: 30000 },
  );
  const truth = await page.evaluate(
    (id) => (window as any).agentCity.truth.agents[id],
    id,
  );
  const ops = Object.values(truth.operations) as any[];
  assert(
    ops.some(
      (o) =>
        o.capability === "workcell.execute" &&
        o.status === "succeeded" &&
        o.metadata?.workcellRef,
    ),
  );
  assert.equal(
    ops.filter((o) => o.capability === "artifact.created").length,
    2,
  );
  if (atBay) {
    assert.equal(atBay.instance, id);
    assert.equal(atBay.follow, id);
  }
  if (outage)
    await page.waitForFunction(
      () => (window as any).agentCity.health === "LIVE",
      undefined,
      { timeout: 30000 },
    );
  assert.deepEqual(errors, []);
  const proof = JSON.parse(
    await readFile(resolve(runtime, "workcell-proof.json"), "utf8"),
  );
  const output = await readFile(
    resolve(
      runtime,
      "workcell-source/.workcell/runs",
      proof.summary.run_id,
      "artifacts/city-result.txt",
    ),
    "utf8",
  );
  assert.equal(output, "5\n");
  const lifecycleCount = (
    await readFile(resolve(runtime, "spool-" + producer + ".jsonl"), "utf8")
  )
    .trim()
    .split("\n").length;
  const recoveredEvidenceCount = ops.reduce(
    (count, op) => count + op.evidence.length,
    0,
  );
  assert.equal(lifecycleCount, 6);
  assert.equal(
    recoveredEvidenceCount,
    lifecycleCount,
    "Every start/completion/artifact must retain evidence",
  );
  const sourceRunCount = (
    await readdir(resolve(runtime, "workcell-source/.workcell/runs"))
  ).filter((name) => /^wc-/.test(name)).length;
  assert.equal(
    sourceRunCount,
    1,
    "Source operation must not be rerun during recovery",
  );
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope: watchdogOutage
          ? "Real Workcell completes while Watchdog is stopped; bounded spool delivers canonical evidence after recovery; no source rerun"
          : outage
            ? "Real Workcell completes while gateway is stopped; restart recovers Watchdog evidence into browser without rerunning source; no travel assertion"
            : "Fresh real Workcell Kujo execution → lifecycle spool → Watchdog canonical intake/export → gateway/SSE → Pixi Follow into Workshop upper bay; no new model request",
        outageTarget: watchdogOutage ? "watchdog" : outage ? "gateway" : null,
        lifecycleCount,
        recoveredEvidenceCount,
        sourceRunCount,
        observerStoppedAt,
        sourceFinishedAt,
        observerRestartedAt,
        producer,
        workcell: proof.summary.run_id,
        output,
        browserVersion: browser.version(),
        atBay,
        finalTruth: truth,
        pageErrors: errors,
        privateEvidence: runtime.slice(root.length + 1),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    outage
      ? "Real Workcell during observer outage and browser recovery: PASS"
      : "Real Workcell canonical pipeline and followed bay: PASS",
  );
} catch (error) {
  await writeFile(
    resolve(runtime, "failure.log"),
    logs.join("").slice(-65536),
    { mode: 0o600 },
  );
  throw error;
} finally {
  await browser?.close();
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill("SIGTERM");
    await new Promise<void>((done) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        done();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        done();
      });
    });
  }
}
