import { chromium } from "@playwright/test";
import { readFile, writeFile, open } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, ".."),
  pids = JSON.parse(
    await readFile(resolve(root, ".runtime/pids.json"), "utf8"),
  );
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto("http://127.0.0.1:5178");
await page.waitForSelector("canvas");
await page.getByRole("button", { name: /DOCS/ }).first().click();
const before = await (
  await fetch("http://127.0.0.1:7792/api/world/snapshot")
).json();
process.kill(pids.gateway, "SIGTERM");
await page.waitForFunction(() => (window as any).agentCity.health === "STALE");
await page.screenshot({
  path: resolve(root, "evidence/06-gateway-stale.png"),
  fullPage: true,
});
const producer =
    (process.env.CITY_SOURCE_PREFIX || "review-") + "outage-" + Date.now(),
  spool = resolve(root, `.runtime/spool-${producer}.jsonl`);
let output = "";
const child = spawn(
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
  ["run", "examples/agent_city_observer.kujo", "--interpreter"],
  {
    cwd: resolve(root, "../dispatch"),
    env: {
      ...process.env,
      KUJO_BIN:
        process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
      RAG_URL: "http://127.0.0.1:8791",
      CITY_PRODUCER: producer,
      CITY_ACTOR: "worker-outage",
      CITY_SPOOL: spool,
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
const code = await new Promise((r) => child.on("exit", r));
let unavailable = false;
try {
  await fetch("http://127.0.0.1:7792/api/world/snapshot", {
    signal: AbortSignal.timeout(1000),
  });
} catch {
  unavailable = true;
}
const log = await open(resolve(root, ".runtime/gateway-recovered.log"), "w");
const gateway = spawn(
  process.execPath,
  ["--import", "tsx", "apps/gateway/main.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CITY_SOURCE_PREFIX: process.env.CITY_SOURCE_PREFIX || "review-",
      CITY_DB: process.env.CITY_DB || resolve(root, ".runtime/review.sqlite"),
    },
    stdio: ["ignore", log.fd, log.fd],
    detached: true,
  },
);
await log.close();
gateway.unref();
pids.gateway = gateway.pid;
await writeFile(resolve(root, ".runtime/pids.json"), JSON.stringify(pids));
try {
  assert.equal(code, 0, output);
  assert(unavailable, "gateway was not stopped during source execution");
  const lines = (await readFile(spool, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(lines.length, 4);
  assert.equal(lines.at(-1).outcome, "succeeded");
  await page.waitForFunction(
    (prefix) =>
      Object.keys((window as any).agentCity.truth.agents).some((id) =>
        id.startsWith(prefix),
      ),
    producer,
    { timeout: 20000 },
  );
  const after = await (
    await fetch("http://127.0.0.1:7792/api/world/snapshot")
  ).json();
  assert(after.truth.gap, "reconnect coverage must be partial");
  const newAgents = Object.values(after.truth.agents).filter((a: any) =>
    a.id.startsWith(producer),
  ) as any[];
  assert.equal(newAgents.length, 1);
  assert.equal(Object.keys(newAgents[0].operations).length, 2);
  assert.equal(newAgents[0].status, "completed");
  await page.getByRole("button", { name: "Dojo", exact: true }).click();
  await page.screenshot({
    path: resolve(root, "evidence/07-dojo-outcomes.png"),
    fullPage: true,
  });
  const frames = (await page.evaluate(
    "new Promise(resolve=>{const values=[];let previous=performance.now();function frame(time){values.push(time-previous);previous=time;if(values.length>=120)resolve(values.slice(1));else requestAnimationFrame(frame);}requestAnimationFrame(frame);})",
  )) as number[];
  frames.sort((a, b) => a - b);
  const selectLatency = await page.evaluate(() => {
    const start = performance.now();
    (document.querySelector("#roster button") as HTMLButtonElement).click();
    return performance.now() - start;
  });
  for (const dpr of [1.25, 2]) {
    const c = await browser.newContext({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: dpr,
    });
    const p = await c.newPage();
    await p.goto("http://127.0.0.1:5178");
    await p.waitForSelector("canvas");
    assert.equal(
      await p.locator("canvas").evaluate((c) => (c as HTMLCanvasElement).width),
      256,
    );
    await c.close();
  }
  const mobile = await browser.newContext({
    viewport: { width: 320, height: 780 },
    reducedMotion: "reduce",
  });
  const mp = await mobile.newPage();
  await mp.goto("http://127.0.0.1:5178");
  await mp.waitForSelector("canvas");
  assert.equal(await mp.evaluate(() => (window as any).agentCity.paused), true);
  assert(await mp.evaluate(() => document.documentElement.scrollWidth <= 320));
  await mp.screenshot({
    path: resolve(root, "evidence/08-mobile.png"),
    fullPage: true,
  });
  await mobile.close();
  await writeFile(
    resolve(root, "evidence/recovery-proof.json"),
    JSON.stringify(
      {
        producer,
        sourceExit: code,
        sourceOutput: output,
        gatewayUnavailableDuringExecution: unavailable,
        retainedBefore: Object.keys(before.truth.agents).length,
        retainedAfter: Object.keys(after.truth.agents).length,
        coverage: after.sourceHealth,
        browser: browser.version(),
        frameP95Ms: frames[Math.floor(frames.length * 0.95)],
        selectionToInspectorMs: selectLatency,
        dpr: [1, 1.25, 2],
        mobileWidth: 320,
        reducedMotion: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Gateway-down real execution, reconnect, stale UI, DPR and mobile: PASS",
  );
} finally {
  await browser.close();
}
