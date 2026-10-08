/** Bounded synthetic intake diagnostic. No model or source task is invoked. */
import { spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { batch } from "./pipeline-fixture";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, ".."),
  runtime = resolve(root, ".runtime/intake-profile-" + randomUUID());
const port = 19801,
  base = "http://127.0.0.1:" + port,
  token = randomBytes(32).toString("hex");
if (!(await portAvailable(port))) throw Error("Diagnostic port occupied");
await mkdir(runtime, { recursive: true });
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ schema_version: "watchdog.exporters.v1", exporters: [] }),
);
const child = spawn(
  resolve(root, "../kujo/target/release/kujo"),
  [
    "run",
    "--interpreter",
    process.env.CITY_PROFILE_WATCHDOG_ENTRY || "dashboard_server.kujo",
  ],
  {
    cwd: resolve(root, "../watchdog"),
    env: {
      ...process.env,
      WDG_HOST: "127.0.0.1",
      WDG_PORT: String(port),
      WDG_DB_PATH: resolve(runtime, "watchdog.sqlite"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: randomBytes(32).toString("hex"),
      WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
      WDG_BACKUP_ENABLED: "false",
      WDG_RATE_LIMIT_MODE: "off",
      WDG_UPSTREAM_BASE_URL: "http://127.0.0.1:1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
child.stdout.on("data", (d) => (log = (log + d).slice(-8000)));
child.stderr.on("data", (d) => (log = (log + d).slice(-8000)));
const result: any = {
  scope:
    "Synthetic canonical HTTP intake alone; no gateway/export/browser; not release throughput qualification",
  runtime,
  samples: [],
};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if (
        (await fetch(base + "/healthz", { signal: AbortSignal.timeout(500) }))
          .ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error("Diagnostic startup failed");
  let offset = 0;
  for (let round = 0; round < 3; round++)
    for (const count of [1, 10, 100]) {
      const body = JSON.stringify(batch(offset, count, "intake-profile"));
      offset += count;
      const began = performance.now();
      const r = await fetch(base + "/telemetry/v2/batches", {
        method: "POST",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(15000),
      });
      const headersMs = performance.now() - began;
      const text = await r.text();
      if (!r.ok) throw Error("Intake rejected: " + r.status);
      result.samples.push({
        round,
        count,
        bytes: Buffer.byteLength(body),
        headersMs,
        totalMs: performance.now() - began,
        response: JSON.parse(text),
      });
    }
  result.status = "PASS";
  if (process.env.CITY_PROFILE_WATCHDOG_ENTRY) result.diagnosticLog = log;
  console.log(JSON.stringify(result));
} catch (e) {
  result.status = "FAILED";
  result.error = String(e);
  result.log = log;
  process.exitCode = 1;
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((r) => child.once("exit", r));
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 2000);
    await exited;
    clearTimeout(timer);
  }
  await writeFile(
    resolve(runtime, "proof.json"),
    JSON.stringify(result, null, 2),
  );
  console.log("Diagnostic evidence:", resolve(runtime, "proof.json"));
}
