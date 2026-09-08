import { createServer } from "node:http";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/bridge-batch-" + Date.now());
await mkdir(runtime, { recursive: true });
for (const port of [18990, 18991])
  assert(await portAvailable(port), `Test port occupied: ${port}`);
const children: ChildProcess[] = [];
const watchdog = "http://127.0.0.1:18990";
const gateway = "http://127.0.0.1:18991";
const token = "owned-synthetic-bridge-token";
await writeFile(
  resolve(runtime, "exporters.json"),
  JSON.stringify({ schema_version: "watchdog.exporters.v1", exporters: [] }),
);
await writeFile(resolve(runtime, "token"), token, { mode: 0o600 });
async function ready(url: string) {
  for (let i = 0; i < 150; i++) {
    if (
      await fetch(url, { signal: AbortSignal.timeout(1000) })
        .then((r) => r.ok)
        .catch(() => false)
    )
      return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(`Test service unavailable: ${url}`);
}
const wrapper = resolve(runtime, "kujo-recorder.mjs");
await writeFile(
  wrapper,
  `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
appendFileSync(process.env.CITY_TEST_CALLS, 'call\\n');
if (process.env.CITY_TEST_FAIL === '1') {
 const jobs = JSON.parse(readFileSync(process.env.CITY_NORMALIZE_WORK, 'utf8'));
 writeFileSync(jobs[0].output, '{'); process.exit(9);
}
const child = spawnSync(process.env.CITY_TEST_KUJO, process.argv.slice(2), { stdio: 'inherit' });
process.exit(child.status ?? 1);
`,
  { mode: 0o700 },
);
const bodies = new Map<string, string>();
let requests = 0,
  failOnce = true;
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const batch = JSON.parse(body);
  const upstream = await fetch(watchdog + "/telemetry/v2/batches", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + token,
    },
    body,
  });
  if (!upstream.ok) {
    res.statusCode = upstream.status;
    res.end(await upstream.text());
    return;
  }
  requests++;
  if (bodies.has(batch.batch_id))
    assert.equal(body, bodies.get(batch.batch_id), "Retry body changed");
  bodies.set(batch.batch_id, body);
  if (bodies.size === 17 && failOnce) {
    failOnce = false;
    res.statusCode = 503;
  }
  res.end("{}");
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
process.env.CITY_RUNTIME_DIR = runtime;
process.env.KUJO_BIN = wrapper;
process.env.CITY_TEST_KUJO = resolve(root, "../kujo/target/release/kujo");
process.env.CITY_TEST_CALLS = resolve(runtime, "calls.txt");
process.env.WATCHDOG_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
process.env.WDG_API_AUTH_TOKEN = "owned-synthetic-bridge-token";
const event = (i: number) => ({
  schema: "kujo.lifecycle.v1",
  producer_instance: "synthetic-bridge-batch",
  run_id: "run-1",
  agent_id: "agent-1",
  task_id: "task-1",
  profile: "fixture",
  operation_id: `operation-${i}`,
  attempt: 1,
  phase: "finished",
  kind: "retrieval",
  outcome: "succeeded",
  occurred_at_ms: 1700000000000 + i,
});
const spool = resolve(runtime, "spool-fixture.jsonl");
const rows = Array.from({ length: 35 }, (_, i) => JSON.stringify(event(i)));
await writeFile(spool, rows.join("\n") + "\n");
const calls = async () =>
  (await readFile(process.env.CITY_TEST_CALLS!, "utf8")).trim().split("\n")
    .length;
try {
  children.push(
    spawn(
      resolve(root, "../kujo/target/release/kujo"),
      ["run", "--interpreter", "dashboard_server.kujo"],
      {
        cwd: resolve(root, "../watchdog"),
        stdio: "ignore",
        env: {
          ...process.env,
          WDG_HOST: "127.0.0.1",
          WDG_PORT: "18990",
          WDG_DB_PATH: resolve(runtime, "watchdog.sqlite"),
          WDG_API_AUTH_MODE: "token",
          WDG_API_AUTH_TOKEN: token,
          WDG_PROXY_AUTHZ_MODE: "token",
          WDG_PROXY_AUTHZ_TOKEN: token,
          WDG_UPSTREAM_BASE_URL: "http://127.0.0.1:1",
          WDG_BACKUP_ENABLED: "false",
          WDG_EXPORTERS_CONFIG_PATH: resolve(runtime, "exporters.json"),
        },
      },
    ),
  );
  await ready(watchdog + "/healthz");
  children.push(
    spawn(process.execPath, ["--import", "tsx", "apps/gateway/main.ts"], {
      cwd: root,
      stdio: "ignore",
      env: {
        ...process.env,
        CITY_PORT: "18991",
        CITY_DB: resolve(runtime, "city.sqlite"),
        CITY_SOURCE_PREFIX: "synthetic-bridge-batch",
        WATCHDOG_URL: watchdog,
      },
    }),
  );
  await ready(gateway + "/api/world/snapshot");
  const { bridgeOnce } = await import("../integrations/kujo/bridge");
  await assert.rejects(bridgeOnce(), /canonical intake 503/);
  assert.equal(await calls(), 2);
  await bridgeOnce();
  assert.equal(
    await calls(),
    3,
    "35 normalizations should use three bounded processes",
  );
  assert.equal(bodies.size, 35);
  assert.equal(requests, 36, "One accepted response failure should retry once");
  const records = [...bodies.values()].map(
    (body) => JSON.parse(body).records[0],
  );
  assert.equal(
    new Set(records.map((r) => r.attributes["kujo.operation.id"])).size,
    35,
  );
  assert.deepEqual(
    records.map((r) => r.attributes["kujo.operation.id"]),
    Array.from({ length: 35 }, (_, i) => `operation-${i}`),
  );
  assert.deepEqual(
    records.map((r) => r.attributes["kujo.source.occurred_at_ms"]).sort(),
    Array.from({ length: 35 }, (_, i) => 1700000000000 + i).sort(),
  );
  await bridgeOnce();
  assert.equal(await calls(), 3);
  assert.equal(requests, 36);
  await writeFile(
    spool,
    [...rows, JSON.stringify(event(35))].join("\n") + "\n",
  );
  process.env.CITY_TEST_FAIL = "1";
  await assert.rejects(bridgeOnce(), /native adapter failed 9/);
  assert.equal(
    (await readdir(resolve(runtime, "batches"))).filter((n) =>
      n.endsWith(".json"),
    ).length,
    35,
    "Partial output became a durable canonical body",
  );
  process.env.CITY_TEST_FAIL = "0";
  await bridgeOnce();
  assert.equal(bodies.size, 36);
  assert.equal(requests, 37);
  assert.equal(await calls(), 5);
  let visible = 0;
  for (let i = 0; i < 100; i++) {
    const snapshot = await (
      await fetch(gateway + "/api/world/snapshot")
    ).json();
    visible = Object.values(snapshot.truth.agents).reduce(
      (n: number, a: any) => n + Object.keys(a.operations).length,
      0,
    );
    if (visible === 36) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(
    visible,
    36,
    "Every observation must reach the actual gateway truth projection",
  );
  const proof = {
    kind: "SYNTHETIC lifecycle spool → real Watchdog native adapter/intake/export → real gateway; injected response loss, not live agent proof",
    visibleOperations: visible,
    events: 36,
    normalizerProcessesForFirst35: 3,
    previousProcessesFor35: 35,
    acceptedResponseRetryByteIdentical: true,
    normalizationFailureRetainedAndRecovered: true,
    repeatedScanNoNewRequests: true,
    occurrenceTimesAndOperationsPreserved: true,
    operationDeliveryOrderPreserved: true,
    httpRequestsIncludingRetry: requests,
    at: new Date().toISOString(),
  };
  await mkdir(resolve(root, "evidence/bridge-batch"), { recursive: true });
  await writeFile(
    resolve(root, "evidence/bridge-batch/proof.json"),
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof));
} finally {
  await new Promise<void>((done) => server.close(() => done()));
  for (const child of children) child.kill("SIGTERM");
  for (
    let i = 0;
    i < 100 &&
    children.some((c) => c.exitCode === null && c.signalCode === null);
    i++
  )
    await new Promise((r) => setTimeout(r, 100));
  for (const port of [18990, 18991])
    assert(await portAvailable(port), `Owned test port not released: ${port}`);
}
