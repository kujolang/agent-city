import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium, type Browser } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { localPorts } from "./local-ports";
import { canonical } from "../packages/world-core/replay";

const root = resolve(import.meta.dirname, ".."),
  prefix = "convergence-" + Date.now();
const runtime = resolve(root, ".runtime", prefix),
  out = resolve(root, "evidence/live-convergence");
await mkdir(runtime, { recursive: true });
await mkdir(out, { recursive: true });
const kujo = resolve(root, "../kujo/target/release/kujo"),
  ports = localPorts({ CITY_PORT_OFFSET: "30000" });
const url = `http://127.0.0.1:${ports.web}`;
const env = {
  ...process.env,
  KUJO_BIN: kujo,
  CITY_PORT_OFFSET: "30000",
  CITY_PORT: String(ports.gateway),
  CITY_CONTROL_PORT: String(ports.control),
  CITY_RUNTIME_DIR: runtime,
  CITY_SOURCE_PREFIX: prefix,
};
const child = spawn(process.execPath, ["--import", "tsx", "scripts/start.ts"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "",
  browser: Browser | undefined;
child.stdout.on("data", (d) => (log = (log + d).slice(-8000)));
child.stderr.on("data", (d) => (log = (log + d).slice(-8000)));
const sourceRuns: any[] = [];
const deadline = setTimeout(() => {
  child.kill("SIGTERM");
  void browser?.close();
  process.exitCode = 1;
}, 180000);
async function source(
  name: string,
  cwd: string,
  file: string,
  extra: Record<string, string>,
) {
  const p = spawn(kujo, ["run", file, "--interpreter"], {
    cwd,
    env: { ...env, ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  p.stdout.on("data", (d) => (output = (output + d).slice(-4000)));
  p.stderr.on("data", (d) => (output = (output + d).slice(-4000)));
  const exitCode = await new Promise((ok, fail) => {
    p.on("exit", ok);
    p.on("error", fail);
  });
  sourceRuns.push({ name, exitCode, output });
  assert.equal(exitCode, 0, output);
}
try {
  while (!log.includes("Agent City ready:")) {
    assert(child.exitCode === null && child.signalCode === null, log);
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage(),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => (window as any).agentCity?.rendererReady);
  const snapshot = async () =>
    (await fetch(url + "/api/world/snapshot")).json();
  const converge = async () => {
    const end = Date.now() + 30000;
    while (Date.now() < end) {
      const s = await snapshot();
      const b = await page.evaluate(() => (window as any).agentCity.truth);
      if (
        s.truth.order > 0 &&
        canonical(s.truth.agents) === canonical(b.agents)
      )
        return { gateway: s, browser: b };
      await new Promise((r) => setTimeout(r, 200));
    }
    throw Error("Browser truth did not converge to gateway");
  };
  await source(
    "actual Dispatch/SDK handoff and RAG, offline model fixture",
    resolve(root, "../dispatch"),
    "examples/agent_city_observer.kujo",
    {
      CITY_HANDOFF: "1",
      CITY_PRODUCER: prefix + "-sdk",
      CITY_ACTOR: "scout",
      CITY_SPOOL: resolve(runtime, "spool-sdk.jsonl"),
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
      RAG_URL: `http://127.0.0.1:${ports.rag}`,
    },
  );
  await page.waitForFunction(
    () =>
      Object.values((window as any).agentCity.truth.agents).some((a: any) =>
        Object.values(a.operations).some(
          (o: any) => o.capability === "rag.query" && o.status === "succeeded",
        ),
      ),
    null,
    { timeout: 30000 },
  );
  const sdk = await converge();
  const evalEnv = {
    CITY_PRODUCER: prefix + "-eval",
    CITY_EVAL_RUN: prefix + "-checks",
    CITY_EVAL_ROOT: runtime,
    CITY_SPOOL: resolve(runtime, "spool-eval.jsonl"),
  };
  await source(
    "actual Eval failed content check",
    resolve(root, "../eval"),
    resolve(root, "integrations/kujo/evaluate.kujo"),
    { ...evalEnv, CITY_EVAL_ATTEMPT: "1" },
  );
  await page.waitForFunction(
    () =>
      Object.values((window as any).agentCity.truth.agents).some((a: any) =>
        Object.values(a.operations).some(
          (o: any) =>
            o.capability === "evaluation.run" && o.status === "failed",
        ),
      ),
    null,
    { timeout: 30000 },
  );
  const failed = await converge();
  await context.setOffline(true);
  await page.waitForFunction(
    () => (window as any).agentCity.health === "STALE",
    null,
    { timeout: 10000 },
  );
  await source(
    "actual Eval repaired pass while browser disconnected",
    resolve(root, "../eval"),
    resolve(root, "integrations/kujo/evaluate.kujo"),
    { ...evalEnv, CITY_EVAL_ATTEMPT: "2" },
  );
  const reconnectAt = Date.now();
  await context.setOffline(false);
  await page.waitForFunction(
    () =>
      Object.values((window as any).agentCity.truth.agents).some((a: any) =>
        Object.values(a.operations).some(
          (o: any) =>
            o.capability === "evaluation.run" &&
            o.attempt === 2 &&
            o.status === "succeeded",
        ),
      ),
    null,
    { timeout: 30000 },
  );
  const repaired = await converge();
  const operations: any[] = Object.values(repaired.browser.agents).flatMap(
    (a: any) => Object.values(a.operations),
  );
  assert(
    operations.some(
      (o) =>
        o.capability === "evaluation.run" &&
        o.attempt === 1 &&
        o.status === "failed",
    ),
  );
  assert(
    operations.some(
      (o) =>
        o.capability === "evaluation.run" &&
        o.attempt === 2 &&
        o.status === "succeeded",
    ),
  );
  const reconnectMs = Date.now() - reconnectAt;
  await page.locator('[data-scene="dojo"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(out, "reconnected.png") });
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: "Fresh actual SDK/RAG/Eval lifecycle → Watchdog → gateway → unmocked browser transport; SDK model is an offline fixture, not a new AI product proof",
        prefix,
        sourceRuns,
        sdk,
        failed,
        repaired,
        reconnectMs,
        errors,
        browser: browser.version(),
        originalLiveTimeoutCause: "not established",
        scope:
          "One bounded live run and browser disconnect/reconnect; not soak or native hidden-tab qualification",
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Fresh live lifecycle and disconnected-browser recovery: PASS");
} finally {
  clearTimeout(deadline);
  await browser?.close();
  child.kill("SIGTERM");
}
