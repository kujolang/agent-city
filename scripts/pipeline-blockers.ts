import { randomBytes } from "node:crypto";
import { chromium, type Browser } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile, stat, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { batch } from "./pipeline-fixture";
const root = resolve(import.meta.dirname, ".."),
  runtime = resolve(root, ".runtime/pipeline-" + Date.now());
await mkdir(runtime, { recursive: true });
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ schema_version: "watchdog.exporters.v1", exporters: [] }),
);
await mkdir("evidence/blockers", { recursive: true });
const children: ChildProcess[] = [];
const port = 18991,
  base = "http://127.0.0.1:" + port,
  city = "http://127.0.0.1:18992";
const kujo = resolve(root, "../kujo/target/release/kujo");
let log = "";
const testToken = randomBytes(32).toString("hex"),
  proxyToken = randomBytes(32).toString("hex");
const launch = (cmd: string, args: string[], cwd: string, env: any) => {
  const c = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(c);
  c.stdout?.on("data", (d) => (log = (log + d).slice(-6000)));
  c.stderr?.on("data", (d) => (log = (log + d).slice(-6000)));
  return c;
};
async function ready(url: string) {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Startup failed " + log);
}
const isSoak = process.env.PIPELINE_SOAK === "1";
const evidencePath =
  process.env.CITY_PIPELINE_OUTPUT ||
  (isSoak ? ".runtime/soak-latest.json" : "evidence/blockers/pipeline.json");
const result: any = {
  startedAt: new Date().toISOString(),
  cityCommit: spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).stdout.trim(),
  watchdogCommit: spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: resolve(root, "../watchdog"),
    encoding: "utf8",
  }).stdout.trim(),
  pid: process.pid,
  runtime,
  status: "RUNNING",
  samples: [],
  kind: "SYNTHETIC canonical HTTP intake → real Watchdog export → real gateway → SSE; no source business execution",
};
let browser: Browser | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let abort = new AbortController();
try {
  launch(
    kujo,
    ["run", "--interpreter", "dashboard_server.kujo"],
    resolve(root, "../watchdog"),
    {
      WDG_PORT: String(port),
      WDG_DB_PATH: resolve(runtime, "watchdog.sqlite"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: testToken,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: proxyToken,
      WDG_UPSTREAM_BASE_URL: "http://127.0.0.1:1",
      WDG_MAX_PARSE_BODY_BYTES: "1048576",
      WDG_BACKUP_ENABLED: "false",
      WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
    },
  );
  await ready(base + "/healthz");
  await writeFile(resolve(runtime, "token"), testToken, { mode: 0o600 });
  const heartbeat = async () => {
    await writeFile(
      resolve(runtime, "bridge-health.next"),
      JSON.stringify({
        status: "LIVE",
        observedAt: Date.now(),
        kind: "synthetic test feeder",
      }),
    );
    await rename(
      resolve(runtime, "bridge-health.next"),
      resolve(runtime, "bridge-health.json"),
    );
  };
  await heartbeat();
  timer = setInterval(() => void heartbeat(), 1000);
  launch(process.execPath, ["--import", "tsx", "apps/gateway/main.ts"], root, {
    CITY_PORT: "18992",
    CITY_RUNTIME_DIR: runtime,
    CITY_DB: resolve(runtime, "city.sqlite"),
    CITY_SOURCE_PREFIX: "synthetic-pipeline",
    WATCHDOG_URL: base,
  });
  await ready(city + "/api/world/snapshot");
  if (isSoak) {
    launch(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "apps/web",
        "--host",
        "127.0.0.1",
        "--port",
        "18888",
      ],
      root,
      { CITY_GATEWAY_URL: city },
    );
    await ready("http://127.0.0.1:18888");
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.CHROMIUM_PATH ||
        "/Users/robertdevore/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell",
    });
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:18888");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    let previous = performance.now(),
      maxSampleGap = 0;
    const sample = async () => {
      try {
        const now = performance.now();
        maxSampleGap = Math.max(maxSampleGap, now - previous);
        previous = now;
        const metrics = await cdp.send("Performance.getMetrics");
        result.samples.push({
          at: new Date().toISOString(),
          metrics: metrics.metrics.filter((m) =>
            ["JSHeapUsedSize", "Nodes", "Documents", "TaskDuration"].includes(
              m.name,
            ),
          ),
          browser: await page.evaluate(() => {
            const a = (window as any).agentCity;
            return a
              ? {
                  order: a.truth.order,
                  health: a.health,
                  instances: Object.keys(a.truth.agents).length,
                  queued: Object.values(a.presentation.walkers).reduce(
                    (n: number, w: any) => n + w.queued.length,
                    0,
                  ),
                }
              : null;
          }),
          journalBytes: (await stat(resolve(runtime, "city.sqlite"))).size,
        });
        if (result.samples.length % 10 === 0) {
          await page.context().setOffline(true);
          try {
            await page.waitForFunction(
              () => (window as any).agentCity?.health === "STALE",
              {},
              { timeout: 5000 },
            );
          } finally {
            await page.context().setOffline(false);
          }
          await page.waitForFunction(
            () => (window as any).agentCity?.health === "LIVE",
            {},
            { timeout: 15000 },
          );
          result.verifiedReconnects = (result.verifiedReconnects || 0) + 1;
        }
        result.maxSampleGapMs = maxSampleGap;
        await writeFile(evidencePath, JSON.stringify(result, null, 2));
      } catch (e) {
        result.sampleError = String(e);
      }
    };
    await sample();
    const sampleTimer = setInterval(() => void sample(), 60000);
    sampleTimer.unref();
  }
  const snap = await (await fetch(city + "/api/world/snapshot")).json();
  let seen = new Set<string>(),
    duplicates = 0;
  const stream = await fetch(
    city + "/api/world/events?after=" + encodeURIComponent(snap.cursor),
    { signal: abort.signal },
  );
  const consume = (async () => {
    const reader = stream.body!.getReader(),
      decoder = new TextDecoder();
    let pending = "";
    try {
      for (;;) {
        const v = await reader.read();
        if (v.done) break;
        pending += decoder.decode(v.value, { stream: true });
        let index;
        while ((index = pending.indexOf("\n\n")) >= 0) {
          const chunk = pending.slice(0, index);
          pending = pending.slice(index + 2);
          const line = chunk.split("\n").find((s) => s.startsWith("data: "));
          if (line) {
            const e = JSON.parse(line.slice(6));
            if (e.source === "synthetic-pipeline") {
              if (seen.has(e.eventId)) duplicates++;
              seen.add(e.eventId);
            }
          }
        }
      }
    } catch (e) {
      if (!abort.signal.aborted) throw e;
    }
  })();
  const duration = Number(process.env.PIPELINE_SECONDS || 60),
    rate = Number(process.env.PIPELINE_RATE || 1100),
    start = performance.now();
  let accepted = 0,
    requestMs: number[] = [];
  for (let i = 0; i < duration * rate; i += 100) {
    const count = Math.min(100, duration * rate - i);
    const t = performance.now();
    const r = await fetch(base + "/telemetry/v2/batches", {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: {
        authorization: "Bearer " + testToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(batch(i, count)),
    });
    if (!r.ok)
      throw Error(
        "Canonical intake " + r.status + " " + (await r.text()).slice(0, 200),
      );
    accepted += count;
    requestMs.push(performance.now() - t);
    if (performance.now() - start > duration * 1000 + 30000) break;
    await new Promise((r) =>
      setTimeout(
        r,
        Math.max(0, start + (accepted / rate) * 1000 - performance.now()),
      ),
    );
  }
  const sentAt = performance.now();
  for (let i = 0; i < 300 && seen.size < accepted; i++)
    await new Promise((r) => setTimeout(r, 100));
  result.offeredRate = rate;
  result.accepted = accepted;
  result.visible = seen.size;
  result.duplicates = duplicates;
  result.missing = accepted - seen.size;
  result.sendSeconds = (sentAt - start) / 1000;
  result.totalSeconds = (performance.now() - start) / 1000;
  result.visibleEventsPerSecond = seen.size / result.totalSeconds;
  result.intakeMs = {
    p50: requestMs.sort((a, b) => a - b)[Math.floor(requestMs.length * 0.5)],
    p95: requestMs[Math.floor(requestMs.length * 0.95)],
  };
  result.status =
    result.missing === 0 && result.duplicates === 0 ? "COMPLETED" : "FAILED";
  const finalSnapshot = await (
    await fetch(city + "/api/world/snapshot")
  ).json();
  result.sourceHealth = finalSnapshot.sourceHealth;
  if (browser) {
    const page = browser.contexts()[0].pages()[0];
    await page.waitForFunction(
      (order) => (window as any).agentCity?.truth.order >= order,
      finalSnapshot.truth.order,
      { timeout: 10000 },
    );
    result.browserFinal = await page.evaluate(() => {
      const a = (window as any).agentCity;
      return {
        order: a.truth.order,
        health: a.health,
        instances: Object.keys(a.truth.agents).length,
      };
    });
    result.browserCaughtUp =
      result.browserFinal.order === finalSnapshot.truth.order;
    if (!result.browserCaughtUp) result.status = "FAILED";
  }
  abort.abort();
  await consume;
} catch (e) {
  result.status = "FAILED";
  result.error = String(e);
  result.serverLog = log;
  process.exitCode = 1;
} finally {
  abort.abort();
  if (timer) clearInterval(timer);
  await browser?.close();
  for (const c of children) if (c.exitCode === null) c.kill();
  await writeFile(evidencePath, JSON.stringify(result, null, 2));
}
console.log(
  JSON.stringify({ ...result, samples: result.samples.length }, null, 2),
);
