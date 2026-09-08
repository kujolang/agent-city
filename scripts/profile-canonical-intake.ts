import { spawn, execFileSync } from "node:child_process";
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { batch } from "./pipeline-fixture";
import { portAvailable } from "./startup-checks";

// Diagnostic copies only: no instrumentation is installed in the producer repo.
const root = resolve(import.meta.dirname, ".."),
  owner = resolve(root, "../watchdog");
const runtime = resolve(root, ".runtime/intake-profile-" + Date.now());
const out = resolve(root, "evidence/intake-profile");
await mkdir(runtime, { recursive: true });
await mkdir(out, { recursive: true });
const port = 18994;
assert(await portAvailable(port), "Diagnostic port occupied");
for (const name of await readdir(owner))
  if (name.endsWith(".kujo"))
    await copyFile(resolve(owner, name), resolve(runtime, name));
const sources: Record<string, string> = {};
function replaceOnce(source: string, anchor: string, replacement: string) {
  assert.equal(
    source.split(anchor).length,
    2,
    "Diagnostic anchor must occur once: " + anchor.slice(0, 70),
  );
  return source.replace(anchor, replacement);
}
function wrap(source: string, name: string, args: string, phase: string) {
  source = replaceOnce(
    source,
    `func ${name}(${args}) {`,
    `func city_profile_original_${name}(${args}) {`,
  );
  return (
    source +
    `\nfunc ${name}(${args}) {\n city_profile_start := current_timestamp()\n city_profile_result := city_profile_original_${name}(${args})\n print("CITY_PROFILE " + to_json({"phase": "${phase}", "milliseconds": current_timestamp() - city_profile_start}))\n return city_profile_result\n}\n`
  );
}
for (const file of ["dashboard_server.kujo", "telemetry_repository.kujo"]) {
  let source = await readFile(resolve(runtime, file), "utf8");
  sources[file] = createHash("sha256").update(source).digest("hex");
  if (file === "dashboard_server.kujo") {
    // Wrappers must be defined before the server starts its blocking listener.
    const start = source.indexOf("func canonical_policy_batch(body) {");
    const end = source.indexOf("\nfunc jsonl_v2_cursor", start);
    assert(start > 0 && end > start);
    source =
      source.slice(0, start) +
      wrap(
        source.slice(start, end),
        "canonical_policy_batch",
        "body",
        "privacy",
      ) +
      source.slice(end);
  } else {
    for (const [name, args, phase] of [
      ["repo_validate_batch", "batch", "validation"],
      ["repo_parent_graph_error", "db, batch", "parent_graph"],
      ["repo_insert_batch_rows", "db, batch", "identity_and_rows"],
    ])
      source = wrap(source, name, args, phase);
  }
  await writeFile(resolve(runtime, file), source);
}
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ schema_version: "watchdog.exporters.v1", exporters: [] }),
);
const token = randomBytes(24).toString("hex");
const child = spawn(
  resolve(root, "../kujo/target/release/kujo"),
  ["run", "--interpreter", resolve(runtime, "dashboard_server.kujo")],
  {
    cwd: runtime,
    env: {
      ...process.env,
      WDG_HOST: "127.0.0.1",
      WDG_PORT: String(port),
      WDG_DB_PATH: resolve(runtime, "profile.sqlite"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: token,
      WDG_BACKUP_ENABLED: "false",
      WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
child.stdout.on("data", (d) => (log = (log + d).slice(-100000)));
child.stderr.on("data", (d) => (log = (log + d).slice(-100000)));
const deadline = setTimeout(() => child.kill("SIGTERM"), 60000);
const requests: number[] = [];
try {
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw Error("Diagnostic exited: " + log.slice(-2000));
    ready = await fetch(url + "/api/proxy-config", {
      headers: { authorization: "Bearer " + token },
      signal: AbortSignal.timeout(1000),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Profile server did not become ready: " + log.slice(-2000));
  for (let i = 0; i < 3; i++) {
    const started = performance.now();
    const response = await fetch(url + "/telemetry/v2/batches", {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(batch(i * 100, 100, "synthetic-profile")),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, await response.text());
    requests.push(performance.now() - started);
  }
  const phases = log
    .split("\n")
    .filter((s) => s.startsWith("CITY_PROFILE "))
    .map((s) => JSON.parse(s.slice(13)));
  assert.equal(
    phases.filter((p) => p.phase === "privacy").length,
    3,
    "Missing instrumentation; imported wrong source copy",
  );
  assert.equal(phases.filter((p) => p.phase === "identity_and_rows").length, 3);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: "SYNTHETIC isolated instrumented Watchdog copy; no model or source business execution",
        watchdogCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: owner,
          encoding: "utf8",
        }).trim(),
        sources,
        requests,
        phases,
        limitations: [
          "Three 100-record batches; wall-clock timing includes host contention and diagnostic overhead",
          "No gateway, exporter or browser; phase timings are not end-to-end throughput",
          "Phase rows record actual calls; no validation or privacy work is bypassed",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Canonical intake phase profile: PASS",
    JSON.stringify({ requests, phases }),
  );
} finally {
  clearTimeout(deadline);
  child.kill("SIGTERM");
  await new Promise<void>((r) => {
    if (child.exitCode !== null) return r();
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      r();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(t);
      r();
    });
  });
}
