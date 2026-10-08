import { randomBytes, createHash } from "node:crypto";
import { chromium, type Browser } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile, stat, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { availableParallelism, cpus, totalmem } from "node:os";
import { batch } from "./pipeline-fixture";
import { portAvailable } from "./startup-checks";
import { localChromiumPath } from "../apps/runner/browser-path";
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
const kujo = process.env.CITY_PIPELINE_KUJO
  ? resolve(process.env.CITY_PIPELINE_KUJO)
  : resolve(root, "../kujo/target/release/kujo");
let log = "";
const testToken = randomBytes(32).toString("hex"),
  proxyToken = randomBytes(32).toString("hex");
const logLimit = process.env.CITY_PIPELINE_DIAGNOSTIC_ENTRY ? 65536 : 6000;
const launch = (cmd: string, args: string[], cwd: string, env: any) => {
  const c = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(c);
  c.stdout?.on("data", (d) => (log = (log + d).slice(-logLimit)));
  c.stderr?.on("data", (d) => (log = (log + d).slice(-logLimit)));
  return c;
};
async function ready(url: string) {
  for (let i = 0; i < 150; i++) {
    try {
      if (
        (
          await fetch(url, {
            signal: AbortSignal.timeout(1000),
            headers: { connection: "close" },
          })
        ).ok
      )
        return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Startup failed " + log);
}
const isSoak = process.env.PIPELINE_SOAK === "1";
const runtimeMode = process.env.PIPELINE_RUNTIME_MODE || "interpreter";
if (!["interpreter", "vm"].includes(runtimeMode))
  throw Error("PIPELINE_RUNTIME_MODE must be interpreter or vm");
const evidencePath =
  process.env.CITY_PIPELINE_OUTPUT ||
  (isSoak ? ".runtime/soak-latest.json" : "evidence/blockers/pipeline.json");
const installation = await readFile(
  resolve(root, "../install-receipt.json"),
  "utf8",
)
  .then((text) => JSON.parse(text))
  .catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
const result: any = {
  platform: process.platform,
  arch: process.arch,
  host: {
    availableParallelism: availableParallelism(),
    cpuModel: cpus()[0]?.model || "UNKNOWN",
    totalMemoryBytes: totalmem(),
  },
  runtimeCandidate: Boolean(process.env.CITY_PIPELINE_KUJO),
  runtimeCandidateRef: process.env.CITY_PIPELINE_KUJO_REF || null,
  runtimeMode,
  runtimeVersion: spawnSync(kujo, ["--version"], {
    encoding: "utf8",
  }).stdout.trim(),
  runtimeSha256: createHash("sha256")
    .update(await readFile(kujo))
    .digest("hex"),
  processResourceColumns: ["pid", "cpuPercentSnapshot", "rssKiB"],
  processResourceScope:
    "Direct process columns plus an observed descendant process tree; no command arguments captured",
  startedAt: new Date().toISOString(),
  cityCommit:
    spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).stdout.trim() ||
    installation?.cityRevision ||
    "UNKNOWN",
  watchdogCommit:
    spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: resolve(root, "../watchdog"),
      encoding: "utf8",
    }).stdout.trim() ||
    installation?.sources?.repositories?.watchdog ||
    "UNKNOWN",
  pid: process.pid,
  runtime,
  diagnostic: Boolean(process.env.CITY_PIPELINE_DIAGNOSTIC_ENTRY),
  status: "RUNNING",
  samples: [],
  kind: "SYNTHETIC canonical HTTP intake → real Watchdog export → real gateway → SSE; no source business execution",
};
let browser: Browser | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let heartbeatWork: Promise<void> | undefined;
let sampleTimer: ReturnType<typeof setInterval> | undefined;
let sampleWork: Promise<void> | undefined;
let abort = new AbortController();
try {
  for (const requiredPort of [port, 18992, ...(isSoak ? [18888] : [])]) {
    if (!(await portAvailable(requiredPort)))
      throw Error("Test port occupied: " + requiredPort);
  }
  launch(
    kujo,
    [
      "run",
      ...(runtimeMode === "interpreter"
        ? ["--interpreter"]
        : ["--scheduler-no-timeout"]),
      process.env.CITY_PIPELINE_DIAGNOSTIC_ENTRY || "dashboard_server.kujo",
    ],
    resolve(root, "../watchdog"),
    {
      WDG_HOST: "127.0.0.1",
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
  timer = setInterval(() => {
    if (heartbeatWork) return;
    heartbeatWork = heartbeat()
      .catch((error) => {
        result.heartbeatError = String(error);
      })
      .finally(() => {
        heartbeatWork = undefined;
      });
  }, 1000);
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
      executablePath: await localChromiumPath(),
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
        if (result.samples.length % 3 === 0) {
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
    sampleTimer = setInterval(() => {
      if (sampleWork) return;
      sampleWork = sample().finally(() => {
        sampleWork = undefined;
      });
    }, 15000);
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
  const concurrency = Number(process.env.PIPELINE_CONCURRENCY || 1);
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 4 ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(rate) ||
    rate <= 0
  )
    throw Error("Invalid bounded pipeline settings");
  result.concurrency = concurrency;
  const resourceSample = () => ({
    elapsedSeconds: (performance.now() - start) / 1000,
    processTree: (() => {
      const rows = spawnSync("ps", ["-axo", "pid=,ppid=,pcpu=,rss="], {
        encoding: "utf8",
      })
        .stdout.trim()
        .split("\n")
        .map((line) => {
          const [pid, ppid, cpuPercent, rssKiB] = line
            .trim()
            .split(/\s+/)
            .map(Number);
          return { pid, ppid, cpuPercent, rssKiB };
        })
        .filter((row) => Object.values(row).every(Number.isFinite));
      const owned = new Set([
        process.pid,
        ...children
          .map((c) => c.pid)
          .filter((p): p is number => p !== undefined),
      ]);
      for (let pass = 0; pass < rows.length; pass++) {
        const before = owned.size;
        for (const row of rows) if (owned.has(row.ppid)) owned.add(row.pid);
        if (owned.size === before) break;
      }
      return rows.filter((row) => owned.has(row.pid));
    })(),
    processes: spawnSync(
      "ps",
      [
        "-o",
        "pid=,pcpu=,rss=",
        "-p",
        [process.pid, ...children.map((c) => c.pid).filter(Boolean)].join(","),
      ],
      { encoding: "utf8" },
    ).stdout.trim(),
  });
  result.processResources = [resourceSample()];
  let accepted = 0,
    nextOffset = 0,
    requestMs: number[] = [];
  result.requestedDurationSeconds = duration;
  result.batchSize = 100;
  result.offeredRate = rate;
  const intakeAbort = new AbortController();
  const uncertain = new Set<number>();
  const workers = await Promise.allSettled(
    Array.from({ length: concurrency }, async () => {
      try {
        while (nextOffset < duration * rate) {
          const i = nextOffset;
          nextOffset += 100;
          const count = Math.min(100, duration * rate - i);
          const t = performance.now();
          uncertain.add(i);
          const r = await fetch(base + "/telemetry/v2/batches", {
            method: "POST",
            signal: AbortSignal.any([
              intakeAbort.signal,
              AbortSignal.timeout(30000),
            ]),
            headers: {
              connection: "close",
              authorization: "Bearer " + testToken,
              "content-type": "application/json",
            },
            body: JSON.stringify(batch(i, count)),
          });
          // Drain every body before reusing the connection; HTTP status alone is
          // insufficient evidence that all records were accepted.
          const response = await r.json();
          if (
            !r.ok ||
            response.ok !== true ||
            response.data?.ok !== true ||
            response.data?.records !== count
          )
            throw Error("Canonical intake rejected or incomplete: " + r.status);
          uncertain.delete(i);
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
      } catch (error) {
        intakeAbort.abort(error);
        throw error;
      }
    }),
  );
  result.acknowledgedRecords = accepted;
  result.observedRecordsAtSenderStop = seen.size;
  result.observedDuplicatesAtSenderStop = duplicates;
  result.uncertainBatches = [...uncertain]
    .sort((a, b) => a - b)
    .map((offset) => ({
      offset,
      count: Math.min(100, duration * rate - offset),
    }));
  result.deliveryReconciled = result.uncertainBatches.length === 0;
  result.processResources.push(resourceSample());
  const failed = workers.find((worker) => worker.status === "rejected");
  if (failed?.status === "rejected")
    throw intakeAbort.signal.reason ?? failed.reason;
  const sentAt = performance.now();
  for (let i = 0; i < 300 && seen.size < accepted; i++)
    await new Promise((r) => setTimeout(r, 100));
  result.requestedDurationSeconds = duration;
  result.batchSize = 100;
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
    result.missing === 0 && result.duplicates === 0 && !result.heartbeatError
      ? "COMPLETED"
      : "FAILED";
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
  if (sampleTimer) clearInterval(sampleTimer);
  await sampleWork;
  await heartbeatWork;
  if (result.sampleError) result.status = "FAILED";
  if (result.heartbeatError) result.status = "FAILED";
  await browser?.close();
  result.forcedCleanup = [];
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await new Promise<void>((done) => {
        const timer = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) {
            result.forcedCleanup.push(child.pid);
            child.kill("SIGKILL");
          }
        }, 2000);
        child.once("exit", () => {
          clearTimeout(timer);
          done();
        });
        child.kill("SIGTERM");
      });
    }),
  );
  if (result.diagnostic) result.serverLog = log;
  await writeFile(evidencePath, JSON.stringify(result, null, 2));
}
console.log(
  JSON.stringify({ ...result, samples: result.samples.length }, null, 2),
);
