import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { Journal } from "../apps/gateway/journal";
const root = resolve(import.meta.dirname, ".."),
  kujo = resolve(root, "../kujo/target/release/kujo"),
  url = "http://127.0.0.1:7794";
const db = resolve(
  root,
  ".runtime/recovery-hardening-" + Date.now() + ".sqlite",
);
const j = new Journal(db);
j.append(
  (await readFile("tests/fixtures/phase1-observations.jsonl", "utf8"))
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s)),
);
j.close();
const children: ChildProcess[] = [];
const result: any = {
  tests: {},
  source:
    "Historical real journal plus a new actual Dispatch/SDK/RAG operation with gateway stopped",
};
function launch(command: string, args: string[], cwd = root, env: any = {}) {
  const c = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  children.push(c);
  return c;
}
async function ready(target: string) {
  for (let n = 0; n < 100; n++) {
    try {
      const r = await fetch(target, { signal: AbortSignal.timeout(500) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Service unavailable " + target);
}
const gateway = () =>
  launch(process.execPath, ["--import", "tsx", "apps/gateway/main.ts"], root, {
    CITY_PORT: "7794",
    CITY_DB: db,
    CITY_SOURCE_PREFIX: "hardening-outage-",
  });
try {
  let c = gateway();
  await ready(url + "/api/world/snapshot");
  const before = await (await fetch(url + "/api/world/snapshot")).json();
  for (const [name, path, options, expected] of [
    [
      "foreign-origin",
      "/api/world/snapshot",
      { headers: { origin: "https://untrusted.invalid" } },
      403,
    ],
    ["read-only", "/api/world/snapshot", { method: "POST" }, 405],
    ["malformed-evidence", "/api/evidence/%ZZ", {}, 400],
    ["unknown-evidence", "/api/evidence/unknown", {}, 404],
    ["expired-cursor", "/api/world/history?after=old:0", {}, 409],
  ] as const) {
    const r = await fetch(url + path, options);
    assert.equal(r.status, expected);
    result.tests[name] = r.status;
  }
  const sse = await fetch(url + "/api/world/events?after=old:0");
  assert.match(await sse.text(), /event: reset/);
  result.tests.sseReset = true;
  c.kill();
  await new Promise((r) => c.once("exit", r));
  let ragReady = false;
  try {
    ragReady = (
      await fetch("http://127.0.0.1:8791/health", {
        signal: AbortSignal.timeout(500),
      })
    ).ok;
  } catch {}
  if (!ragReady) {
    launch(
      kujo,
      [
        "run",
        "main.kujo",
        "--interpreter",
        "serve",
        "--host",
        "127.0.0.1",
        "--port",
        "8791",
      ],
      resolve(root, "../rag"),
      { KUJO_RAG_INDEX_PATH: resolve(root, ".runtime/rag.json") },
    );
    await ready("http://127.0.0.1:8791/health");
  }
  const producer = "hardening-outage-" + Date.now(),
    spool = resolve(root, ".runtime/spool-" + producer + ".jsonl");
  const source = launch(
    kujo,
    ["run", "examples/agent_city_observer.kujo", "--interpreter"],
    resolve(root, "../dispatch"),
    {
      KUJO_BIN: kujo,
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
      RAG_URL: "http://127.0.0.1:8791",
      CITY_PRODUCER: producer,
      CITY_ACTOR: "hardening-worker",
      CITY_SPOOL: spool,
    },
  );
  const code = await new Promise((r) => source.once("exit", r));
  assert.equal(code, 0);
  result.realOperation = {
    producer,
    exitCode: code,
    spoolBytes: (await stat(spool)).size,
    gatewayStopped: true,
    scope:
      "Actual Dispatch/SDK local RAG completed; outage spool not asserted ingested by Watchdog in this test",
  };
  c = gateway();
  await ready(url + "/api/world/snapshot");
  const after = await (await fetch(url + "/api/world/snapshot")).json();
  assert.equal(
    Object.keys(after.truth.agents).length,
    Object.keys(before.truth.agents).length,
  );
  assert.equal(after.epoch, before.epoch);
  result.tests.restart = {
    sameEpoch: true,
    instances: Object.keys(after.truth.agents).length,
    order: after.truth.order,
  };
  result.tests.cursorRecovery = {
    coverage:
      "Gateway journal restart tested; signed Watchdog store replacement remains unverified",
  };
} catch (e) {
  result.error = String(e);
  process.exitCode = 1;
} finally {
  for (const c of children) if (c.exitCode === null) c.kill();
  await mkdir("evidence/hardening", { recursive: true });
  await writeFile(
    "evidence/hardening/recovery.json",
    JSON.stringify(result, null, 2),
  );
}
console.log(JSON.stringify(result, null, 2));
