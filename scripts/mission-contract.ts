import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { prepareMcpProof } from "./prepare-mcp-proof";

const root = resolve(import.meta.dirname, "..");
const prefix = "fixture-control-" + Date.now() + "-";
const origin = "http://127.0.0.1:5178";
const requests: any[] = [];
let calls = 0,
  failProvider = false,
  redirectProvider = false,
  release = () => {};
const barrier = new Promise<void>((r) => {
  release = r;
});
const provider = createServer((req, res) => {
  let requestBody = "";
  req.on("data", (chunk) => {
    requestBody += chunk;
  });
  req.on("end", async () => {
    requests.push(JSON.parse(requestBody));
    calls++;
    if (calls === 1) await barrier;
    if (redirectProvider && req.url !== "/redirected") {
      res.writeHead(302, { Location: "/redirected" });
      res.end();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        failProvider
          ? { error: "fixture failure" }
          : {
              choices: [
                {
                  message: {
                    content:
                      calls === 1
                        ? "Private fixture draft"
                        : "Private fixture reviewed output",
                  },
                },
              ],
            },
      ),
    );
  });
});
await new Promise<void>((r) => provider.listen(18996, "127.0.0.1", r));
function startService() {
  return spawn(process.execPath, ["--import", "tsx", "apps/runner/main.ts"], {
    cwd: root,
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "18997",
      CITY_CONTROL_DIR: resolve(root, ".runtime", prefix),
      CITY_MISSIONS_DIR: resolve(root, ".runtime", prefix, "missions"),
      CITY_SOURCE_PREFIX: prefix,
      CITY_MODEL_ENDPOINT: "http://127.0.0.1:18996/v1/chat/completions",
      CITY_MODEL: "synthetic-contract-fixture",
      RAG_URL: "http://127.0.0.1:18995",
      CITY_MCP_URL: "http://127.0.0.1:18994/mcp/v1",
      CITY_MCP_TOKEN: "isolated-contract-mcp-token",
      CITY_MODEL_API_KEY: "fixture-secret-not-a-real-key",
    },
    stdio: "ignore",
  });
}
let service = startService();
const get = async (path = "/control/status", init?: RequestInit) =>
  fetch("http://127.0.0.1:18997" + path, init);
async function until<T>(fn: () => Promise<T>, ok: (value: T) => boolean) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (ok(value)) return value;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Contract condition timed out");
}
let rag: ReturnType<typeof spawn> | null = null;
let mcp: ReturnType<typeof spawn> | null = null;
try {
  const mcpRoot = await prepareMcpProof(
    resolve(root, ".runtime", prefix, "mcp"),
    18994,
    "isolated-contract-mcp-token",
  );
  mcp = spawn(
    resolve(root, "../kujo/target/release/kujo"),
    ["run", "server.kujo", "--interpreter"],
    { cwd: mcpRoot, stdio: "ignore" },
  );
  await until(
    async () =>
      (
        await fetch("http://127.0.0.1:18994/mcp/v1/health", {
          headers: { authorization: "Bearer isolated-contract-mcp-token" },
        })
      ).ok,
    Boolean,
  );
  const ragIndex = resolve(root, ".runtime", prefix, "rag.json");
  await mkdir(resolve(root, ".runtime", prefix), {
    recursive: true,
    mode: 0o700,
  });
  const kujo = resolve(root, "../kujo/target/release/kujo");
  const ragEnv = { ...process.env, KUJO_RAG_INDEX_PATH: ragIndex };
  const ingest = spawn(
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "ingest",
      "--path",
      "./examples/kujo_docs",
      "--recursive",
      "true",
      "--namespace",
      "agent-city",
    ],
    { cwd: resolve(root, "../rag"), env: ragEnv, stdio: "ignore" },
  );
  assert.equal(await new Promise((r) => ingest.once("exit", r)), 0);
  rag = spawn(
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      "18995",
    ],
    { cwd: resolve(root, "../rag"), env: ragEnv, stdio: "ignore" },
  );
  await until(
    async () => (await fetch("http://127.0.0.1:18995/health")).ok,
    (v) => v,
  );
  let status = await until(
    async () => (await get()).json(),
    (v) => Boolean(v.token),
  );
  assert(!JSON.stringify(status).includes("fixture-secret"));
  assert.equal(
    (
      await get("/control/status", {
        headers: { Origin: "https://foreign.invalid" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await get("/control/missions", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    403,
  );
  const post = (body: unknown) =>
    get("/control/missions", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-City-Command-Token": status.token,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await post(null)).status, 400);
  const accepted = await post({
    kind: "writing",
    prompt:
      "Private fixture task do not put in telemetry: explain Kujo imports",
    useLocalDocs: true,
    useMcpDocs: true,
  });
  assert.equal(accepted.status, 202);
  const job = await accepted.json();
  await until(
    async () => calls,
    (n) => n === 1,
  );
  assert.equal(
    (await post({ kind: "writing", prompt: "Second task" })).status,
    409,
  );
  const spool = resolve(root, `.runtime/spool-${prefix}${job.id}.jsonl`);
  const started = await readFile(spool, "utf8");
  assert(started.includes('"phase":"started"'));
  assert(
    !started
      .trim()
      .split("\n")
      .map((s) => JSON.parse(s))
      .some((e) => e.kind === "agent" && e.phase === "finished"),
  );
  const priorToken = status.token;
  const exited = new Promise((r) => service.once("exit", r));
  service.kill("SIGKILL");
  await exited;
  service = startService();
  status = await until(
    async () => (await get()).json(),
    (v) => Boolean(v.token) && v.token !== priorToken,
  );
  assert.equal(status.jobs[0].id, job.id);
  assert.equal(status.jobs[0].status, "unknown");
  assert.equal(status.busy, true);
  assert.equal(
    (
      await post({
        kind: "writing",
        prompt: "No duplicate admission during recovery",
      })
    ).status,
    409,
  );
  assert.equal(calls, 1);
  release();
  await until(
    async () => (await get()).json(),
    (v) => v.jobs[0]?.status === "completed",
  );
  assert.equal(calls, 2);
  assert(
    JSON.stringify(requests[0].messages).includes("Demo Documentation"),
    "Actual MCP content must reach the writing model",
  );
  assert(
    JSON.stringify(requests[1].messages).includes("Demo Documentation"),
    "Actual MCP content must reach the reviewer",
  );
  assert(
    JSON.stringify(requests[1].messages).includes(
      "Private fixture task do not put in telemetry: explain Kujo imports",
    ),
    "Reviewer must retain the original task requirements",
  );
  const rows = (await readFile(spool, "utf8"))
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  assert(
    rows.some(
      (e) =>
        e.agent_id === "reviewer" &&
        e.phase === "finished" &&
        e.outcome === "succeeded",
    ),
  );
  assert(rows.some((e) => e.capability === "artifact.created"));
  const mcpRows = rows.filter((e) => e.capability === "mcp.call");
  assert.equal(mcpRows.length, 2);
  assert.equal(mcpRows[0].phase, "started");
  assert.equal(mcpRows[1].outcome, "succeeded");
  assert.equal(mcpRows[1].metadata.server, "mcp-demo");
  assert(!JSON.stringify(rows).includes("Demo Documentation"));
  assert(
    rows.some(
      (e) =>
        e.capability === "dispatch.task" &&
        e.metadata?.taskState === "completed",
    ),
  );
  const dispatch = JSON.parse(
    await readFile(
      resolve(root, ".runtime", prefix, "missions", job.id, "dispatch.json"),
      "utf8",
    ),
  );
  assert.equal(dispatch.ok, true);
  assert(
    rows.some(
      (e) =>
        e.kind === "retrieval" &&
        e.phase === "finished" &&
        e.outcome === "succeeded",
    ),
  );
  assert(
    rows.some((e) => e.agent_id === "writer" && e.run_id === dispatch.run_id),
  );
  assert(!JSON.stringify(rows).includes("Private fixture"));
  assert(!JSON.stringify(rows).includes("fixture-secret"));
  const artifact = await (await get("/control/artifact/" + job.id)).json();
  assert.equal(artifact.content, "Private fixture reviewed output");
  assert.equal(artifact.codeExecuted, false);
  const exchanges = await (await get("/control/exchanges/" + job.id)).json();
  assert.equal(exchanges.recordingComplete, true);
  assert.equal(exchanges.records.length, 2);
  assert.equal(exchanges.records[0].content, "Private fixture draft");
  assert.equal(exchanges.records[1].content, "Private fixture reviewed output");
  for (const entry of exchanges.records)
    assert(
      rows.some(
        (e) =>
          e.agent_id === entry.agent &&
          e.run_id === entry.run &&
          e.producer_instance === entry.producer,
      ),
    );
  failProvider = true;
  assert.equal(
    (
      await post({
        kind: "code",
        prompt: "Private fixture code task",
        functionContract: {
          exportName: "sum",
          cases: [{ name: "empty", args: [[]], equals: 0 }],
        },
      })
    ).status,
    202,
  );
  const end = await until(
    async () => (await get()).json(),
    (v) => v.jobs[0]?.status === "failed",
  );
  assert.equal(end.jobs[1].status, "completed");
  assert(
    JSON.stringify(requests[2].messages).includes("Required output contract"),
  );
  assert(
    JSON.stringify(requests[2].messages).includes("named export function sum"),
  );
  const failedDetails = await (
    await get("/control/mission/" + end.jobs[0].id)
  ).json();
  assert.equal(failedDetails.functionContract.exportName, "sum");
  failProvider = false;
  redirectProvider = true;
  assert.equal(
    (await post({ kind: "writing", prompt: "Redirect contract" })).status,
    202,
  );
  await until(
    async () => (await get()).json(),
    (v) => v.jobs[0]?.status === "failed",
  );
  assert.equal(
    calls,
    4,
    "Provider redirects must not forward credentials to another URL",
  );
  redirectProvider = false;
  assert.equal((await get("/control/mission/not-in-this-history")).status, 404);
  assert.equal(
    (
      await post({
        kind: "writing",
        prompt: "Continue",
        parentMissionId: "not-in-this-history",
      })
    ).status,
    404,
  );
  assert.equal(
    (await post({ kind: "code", prompt: "Continue", parentMissionId: job.id }))
      .status,
    400,
  );
  const details = await (await get("/control/mission/" + job.id)).json();
  assert.equal(
    details.originalTask,
    "Private fixture task do not put in telemetry: explain Kujo imports",
  );
  const continued = await post({
    kind: "writing",
    prompt: "Shorten the prior result",
    parentMissionId: job.id,
  });
  assert.equal(continued.status, 202);
  const followup = await continued.json();
  const continuedState = await until(
    async () => (await get()).json(),
    (v) => v.jobs[0]?.id === followup.id && v.jobs[0].status === "completed",
  );
  assert.equal(continuedState.jobs[0].parentMissionId, job.id);
  assert.equal(continuedState.jobs[0].rootMissionId, job.id);
  assert.equal(calls, 6);
  for (const request of requests.slice(-2)) {
    const text = JSON.stringify(request.messages);
    assert(text.includes("Private fixture reviewed output"));
    assert(text.includes("Shorten the prior result"));
    assert(text.includes("explain Kujo imports"));
  }
  const continuedSpool = await readFile(
    resolve(root, `.runtime/spool-${prefix}${followup.id}.jsonl`),
    "utf8",
  );
  assert(!continuedSpool.includes("Private fixture"));
  assert(!continuedSpool.includes("Shorten the prior result"));
  assert(
    !continuedSpool.includes('"capability":"mcp.call"'),
    "Follow-up must not silently re-invoke prior MCP request",
  );
  const evidence = {
    kind: "SYNTHETIC PROVIDER CONTRACT; not live AI product proof",
    passed: true,
    calls,
    observedRows: rows.length,
    startedBeforeControlledCompletion: true,
    reviewerHandoff: true,
    originalTaskReachesReviewer: true,
    dispatchOwnedTaskState: true,
    realLocalRag: true,
    realLocalMcp: true,
    mcpContextReachesBothModels: true,
    redirectsRejected: true,
    privateArtifact: true,
    sourceQualifiedDraftAndReview: true,
    serviceCrashDoesNotStopSource: true,
    persistedReceiptRecovery: true,
    metadataOnlySpool: true,
    providerFailureRetained: true,
    unauthorizedRequestsRejected: true,
    continuationContextReachesBothModels: true,
    continuationRetainsParentAndOriginalTask: true,
    continuationDoesNotRepeatPriorToolRequests: true,
    requestedCheckContractReachesModel: true,
    failedProviderRetainsRequestedCheckContract: true,
    at: new Date().toISOString(),
  };
  await mkdir(resolve(root, "evidence/missions"), { recursive: true });
  await writeFile(
    resolve(root, "evidence/missions/contract.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(evidence);
} finally {
  release();
  service.kill("SIGTERM");
  provider.close();
  rag?.kill("SIGTERM");
  mcp?.kill("SIGTERM");
}
