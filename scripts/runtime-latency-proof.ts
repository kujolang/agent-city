/** Bounded real Dispatch/SDK/local RAG latency; offline model fixture, not a new AI product demo. */
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { localPorts } from "./local-ports";
import { localChromiumPath } from "../apps/runner/browser-path";
import { boundedCommand } from "../apps/runner/bounded-command";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/latency-" + Date.now());
const out = resolve(root, "evidence/runtime-latency");
await mkdir(out, { recursive: true });
const env = {
  ...process.env,
  CITY_RUNTIME_DIR: runtime,
  CITY_PORT_OFFSET: "14000",
  CITY_SOURCE_PREFIX: "latency-",
  CITY_ENABLE_WORKCELL: "0",
};
const ports = localPorts(env),
  origin = `http://127.0.0.1:${ports.web}`;
const kujo =
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo");
const children: { child: ChildProcess; done: Promise<void> }[] = [];
const stack = spawn(process.execPath, ["--import", "tsx", "scripts/start.ts"], {
  cwd: root,
  env,
  stdio: "ignore",
});
children.push({
  child: stack,
  done: new Promise((ok, fail) => {
    stack.once("exit", () => ok());
    stack.once("error", fail);
  }),
});
let release = () => {},
  arrived = false,
  barrier = Promise.resolve();
const proxy = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const actual = await fetch(`http://127.0.0.1:${ports.rag}` + req.url, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: Buffer.concat(chunks),
    });
    const body = await actual.text();
    arrived = true;
    await barrier;
    res.writeHead(actual.status, { "Content-Type": "application/json" });
    res.end(body);
  } catch {
    res.writeHead(502);
    res.end("retrieval fixture proxy failed");
  }
});
await new Promise<void>((ok) => proxy.listen(0, "127.0.0.1", ok));
const proxyPort = (proxy.address() as any).port;
let browser;
const proof: any = {
  scope:
    "Real Dispatch/SDK/local RAG via spool→Watchdog→gateway→SSE→selected DOM inspector. Offline model, controlled retrieval completion, selected terminal observations only; no model-account calls. Visible means matching DOM state plus two animation-frame opportunities, not physical GPU scanout.",
  runtime,
  runs: [],
  rows: [],
  softwareBrowser: process.env.CITY_LATENCY_SOFTWARE === "1",
  startedAt: new Date().toISOString(),
};
try {
  let ready = false;
  for (let i = 0; i < 250; i++) {
    if (stack.exitCode !== null)
      throw Error("Owned stack exited before readiness");
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "owned stack readiness");
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
    args: proof.softwareBrowser
      ? [
          "--use-gl=angle",
          "--use-angle=swiftshader-webgl",
          "--enable-unsafe-swiftshader",
        ]
      : [],
  });
  proof.browser = browser.version();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(`
    window.cityLatency = { rows: [], pending: [], excludedUnselected: 0 };
    const NativeSource = window.EventSource;
    window.EventSource = class extends NativeSource {
      constructor(url, options) { super(url, options); this.addEventListener('world', event => {
        const e = JSON.parse(event.data);
        if (!e.source?.startsWith('latency-') || !e.operation || !e.occurredAt || e.type==='operation.started') return;
        if (window.agentCity?.selected !== e.instance) { window.cityLatency.excludedUnselected++; return; }
        window.cityLatency.pending.push({ eventId:e.eventId, instance:e.instance, operation:e.operation.id, capability:e.operation.capability, occurrence:e.occurredAt, gateway:e.observedAt, received:Date.now(), status:e.type==='operation.started'?'active':e.operation.outcome });
      }); }
    };
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(() => {
        for (const row of window.cityLatency.pending) {
          if (row.queued || window.agentCity?.selected !== row.instance) continue;
          const button = Array.from(document.querySelectorAll('#operations button')).find(b => b.dataset.status === row.status && b.textContent.includes(' / '+row.operation+' ·'));
          if (!button) continue;
          row.queued = true; row.dom = Date.now();
          requestAnimationFrame(() => requestAnimationFrame(() => {
            row.visible = Date.now();
            row.upstreamToVisibleMs = row.visible-row.occurrence;
            row.receiptToVisibleMs = row.visible-row.received;
            row.upstreamToGatewayMs = row.gateway-row.occurrence;
            window.cityLatency.rows.push(row);
          }));
        }
      }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, characterData:true });
    });
  `);
  await page.goto(origin);
  await page.waitForSelector("#canvas canvas");
  for (let n = 0; n < 5; n++) {
    arrived = false;
    barrier = new Promise<void>((ok) => {
      release = ok;
    });
    const producer = `latency-${Date.now()}-${n}`;
    const source = boundedCommand(
      kujo,
      ["run", "examples/agent_city_observer.kujo", "--interpreter"],
      {
        cwd: resolve(root, "../dispatch"),
        env: {
          ...env,
          KUJO_BIN: kujo,
          RAG_URL: `http://127.0.0.1:${proxyPort}`,
          CITY_PRODUCER: producer,
          CITY_ACTOR: "worker-1",
          CITY_SPOOL: resolve(runtime, `spool-${producer}.jsonl`),
          CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
        },
        timeoutMs: 40_000,
      },
    );
    try {
      const row = page.locator(`#roster [data-instance^="${producer}:"]`);
      await row.waitFor({ timeout: 20_000 });
      await row.click();
      await page.waitForFunction(
        (prefix) =>
          Object.values((window as any).agentCity.truth.agents).some(
            (a: any) =>
              a.id.startsWith(prefix) &&
              Object.values(a.operations).some(
                (o: any) =>
                  o.capability === "rag.query" && o.status === "active",
              ),
          ),
        producer,
      );
      assert(arrived, "actual local RAG response held");
    } finally {
      release();
    }
    const completed = await source;
    assert.equal(completed.code, 0, completed.output);
    assert.equal(completed.timedOut, false);
    await page.waitForFunction(
      (prefix) =>
        (window as any).cityLatency.rows.filter(
          (r: any) =>
            r.instance.startsWith(prefix) &&
            ["rag.query", "agent.run", "dispatch.task"].includes(
              r.capability,
            ) &&
            r.status === "succeeded",
        ).length >= 3,
      producer,
      { timeout: 15_000 },
    );
    proof.runs.push({
      producer,
      sourceExit: completed.code,
      actualRetrieval: true,
    });
  }
  const measurement = await page.evaluate(() => (window as any).cityLatency);
  proof.rows = measurement.rows;
  proof.excludedBeforeSelection = measurement.excludedUnselected;
  proof.unpaintedSelected = measurement.pending.filter(
    (r: any) => !r.visible,
  ).length;
  assert.equal(proof.unpaintedSelected, 0);
  assert.deepEqual(errors, []);
  for (const key of [
    "upstreamToVisibleMs",
    "receiptToVisibleMs",
    "upstreamToGatewayMs",
  ]) {
    const values = proof.rows
      .map((r: any) => r[key])
      .sort((a: number, b: number) => a - b);
    assert(values.every((n: number) => n >= 0));
    proof[key] = {
      count: values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      max: values.at(-1),
    };
  }
  proof.inspectorTargetMet = proof.receiptToVisibleMs.p95 <= 250;
  proof.status = "MEASURED";
} catch (error) {
  proof.status = "FAILED";
  proof.error = String(error);
  process.exitCode = 1;
} finally {
  release();
  proxy.closeAllConnections();
  await new Promise<void>((ok) => proxy.close(() => ok()));
  await browser?.close();
  for (const item of children) item.child.kill("SIGTERM");
  await Promise.all(children.map((item) => item.done));
  proof.finishedAt = new Date().toISOString();
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: proof.status,
      error: proof.error,
      samples: proof.rows.length,
      upstream: proof.upstreamToVisibleMs,
      inspector: proof.receiptToVisibleMs,
    }),
  );
}
