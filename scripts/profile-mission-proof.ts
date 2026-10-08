import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { importCatalog, saveCatalog } from "../apps/runner/agent-catalog";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime", "profiles-" + randomUUID());
await mkdir(runtime, { recursive: true });
const catalog = await importCatalog(resolve(root, "../kujo-agents"));
await saveCatalog(resolve(runtime, "control/agent-catalog.json"), catalog);
const real = process.env.CITY_PROFILE_PROOF_REAL === "1";
const realDocs = real && !!process.env.CITY_PROFILE_PROOF_MCP_URL;
const model = real
  ? process.env.CITY_PROFILE_PROOF_MODEL || "qwen2.5-coder:1.5b-instruct"
  : "profile-fixture";
const requests: any[] = [];
const docCalls: any[] = [];
let malformedReviewer = false;
const provider = createServer((req, res) => {
  if (req.url === "/mcp/v1/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ server: "controlled-profile-docs" }));
    return;
  }
  let body = "";
  req.on("data", (b) => (body += b));
  req.on("end", () => {
    if (req.url === "/mcp/v1/tools/call") {
      const call = JSON.parse(body);
      docCalls.push(call);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: call.id,
          result: {
            content: [
              {
                type: "text",
                text: "PROFILE_DOCS_CANARY: add returns its operands' sum.",
              },
            ],
          },
        }),
      );
      return;
    }
    requests.push(JSON.parse(body));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content: !requests
                .at(-1)
                .messages.some(
                  (m: any) =>
                    m.role === "system" &&
                    m.content.includes("# Code Reviewer"),
                )
                ? "Draft: add returns the sum of two numbers."
                : malformedReviewer
                  ? "Malformed reviewer response retained"
                  : "```json\n" +
                    JSON.stringify({
                      cityArtifact:
                        "Reviewed: add returns the sum of two numbers.",
                      cityReview:
                        "Controlled reviewer commentary; no execution claimed.",
                    }) +
                    "\n```",
            },
          },
        ],
      }),
    );
  });
});
if (!real)
  await new Promise<void>((r) => provider.listen(19896, "127.0.0.1", r));
const service = spawn(
  process.execPath,
  ["--import", "tsx", "apps/runner/main.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "19897",
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_RUNTIME_DIR: runtime,
      CITY_SOURCE_PREFIX: "profile-proof-",
      CITY_MODEL_ENDPOINT: real
        ? "http://127.0.0.1:11434/v1/chat/completions"
        : "http://127.0.0.1:19896/v1/chat/completions",
      CITY_MODEL: model,
      CITY_MODEL_API_KEY: "",
      ...(realDocs
        ? {
            CITY_MCP_URL: process.env.CITY_PROFILE_PROOF_MCP_URL,
            CITY_MCP_TOKEN: process.env.CITY_PROFILE_PROOF_MCP_TOKEN || "",
          }
        : {}),
      ...(!real
        ? { CITY_MCP_URL: "http://127.0.0.1:19896/mcp/v1", CITY_MCP_TOKEN: "" }
        : {}),
    },
    stdio: "ignore",
  },
);
const base = "http://127.0.0.1:19897";
async function until(
  fn: () => Promise<any>,
  check: (v: any) => boolean,
  ms = 30000,
) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const value = await fn();
      if (check(value)) return value;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Bounded profile proof timed out");
}
try {
  const status = await until(
    async () => (await fetch(base + "/control/status")).json(),
    (s) => !!s.token,
  );
  const post = (body: any) =>
    fetch(base + "/control/missions", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5178",
        "Content-Type": "application/json",
        "X-City-Command-Token": status.token,
      },
      body: JSON.stringify(body),
    });
  const profiles = {
    authorId: "kujolang/kujo-agents:chain.documentation-writer",
    reviewerId: "kujolang/kujo-agents:chain.code-reviewer",
  };
  const task = {
    kind: "writing",
    prompt:
      "Write a brief Markdown documentation draft for this source snippet: func add(a, b) { return a + b }. State only that it returns the sum and show add(2, 3) returning 5. This supplied snippet is the complete source evidence. Do not claim to read files or run tools. The reviewer should review the draft and return corrected documentation.",
    profiles,
    useMcpDocs: !real || realDocs,
  };
  const refused = await post({
    ...task,
    profiles: {
      ...profiles,
      authorId: "kujolang/kujo-agents:webops.webops-reporter",
    },
  });
  assert.equal(refused.status, 400);
  const refusedTool = await post({
    ...task,
    profiles: { ...profiles, authorId: profiles.reviewerId },
    useMcpDocs: true,
  });
  assert.equal(refusedTool.status, 400);
  const response = await post(task);
  const accepted = await response.json();
  assert.equal(response.status, 202, JSON.stringify(accepted));
  const final = await until(
    async () => (await fetch(base + "/control/status")).json(),
    (s) =>
      !s.busy &&
      s.jobs.some((j: any) => j.id === accepted.id && j.status !== "running"),
    240000,
  );
  const job = final.jobs.find((j: any) => j.id === accepted.id);
  assert.equal(job.status, "completed", JSON.stringify(job));
  const snapshot = JSON.parse(
    await readFile(
      resolve(runtime, "missions", job.id, "profiles.json"),
      "utf8",
    ),
  );
  assert.equal(snapshot.author.id, profiles.authorId);
  assert.equal(snapshot.reviewer.id, profiles.reviewerId);
  const spool = (
    await readFile(
      resolve(runtime, `spool-profile-proof-${job.id}.jsonl`),
      "utf8",
    )
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert(spool.some((e) => e.profile === profiles.authorId));
  assert(spool.some((e) => e.profile === profiles.reviewerId));
  assert(spool.some((e) => e.kind === "handoff" && e.phase === "finished"));
  if (realDocs) {
    const observed = spool.filter((e) => e.capability === "mcp.call");
    assert.deepEqual(
      observed.map((e) => e.phase),
      ["started", "finished"],
    );
    assert.equal(observed[1].outcome, "succeeded");
    assert(observed.every((e) => e.profile === profiles.authorId));
  }
  if (!real) {
    assert.equal(requests.length, 2);
    assert.equal(docCalls.length, 1);
    assert.equal(docCalls[0].params.name, "read_project_docs");
    assert.deepEqual(docCalls[0].params.arguments, { file_name: "README" });
    for (const request of requests)
      assert(
        request.messages.some((m: any) =>
          m.content.includes("PROFILE_DOCS_CANARY"),
        ),
      );
    const tools = spool.filter((e) => e.capability === "mcp.call");
    assert.deepEqual(
      tools.map((e) => e.phase),
      ["started", "finished"],
    );
    assert(
      tools.every(
        (e) => e.profile === profiles.authorId && e.agent_id === "writer",
      ),
    );
    assert(!JSON.stringify(spool).includes("PROFILE_DOCS_CANARY"));
    assert(
      requests[0].messages.some((m: any) =>
        m.content.includes("# Documentation Writer"),
      ),
    );
    assert(
      requests[1].messages.some((m: any) =>
        m.content.includes("# Code Reviewer"),
      ),
    );
  }
  let continuationPreserved = false;
  if (!real) {
    await saveCatalog(resolve(runtime, "control/agent-catalog.json"), {
      ...catalog,
      profiles: [],
    });
    const resumedResponse = await post({
      kind: "writing",
      prompt:
        "Keep the original requirements and make the documentation concise.",
      parentMissionId: job.id,
    });
    const resumed = await resumedResponse.json();
    assert.equal(resumedResponse.status, 202, JSON.stringify(resumed));
    const resumedStatus = await until(
      async () => (await fetch(base + "/control/status")).json(),
      (s) =>
        !s.busy &&
        s.jobs.some((j: any) => j.id === resumed.id && j.status !== "running"),
    );
    assert.equal(
      resumedStatus.jobs.find((j: any) => j.id === resumed.id).status,
      "completed",
    );
    const retained = JSON.parse(
      await readFile(
        resolve(runtime, "missions", resumed.id, "profiles.json"),
        "utf8",
      ),
    );
    assert.deepEqual(retained, snapshot);
    continuationPreserved = true;
  }
  let malformedRejected = false;
  const artifact = await readFile(
    resolve(runtime, "missions", job.id, "reviewed.md"),
    "utf8",
  );
  assert(artifact.trim());
  const reviewRecord = JSON.parse(
    await readFile(
      resolve(runtime, "missions", job.id, "reviewed.md.review.json"),
      "utf8",
    ),
  );
  assert.equal(reviewRecord.schema, "agent-city.review.v1");
  assert.equal(typeof reviewRecord.commentary, "string");
  if (!real) {
    assert.equal(artifact, "Reviewed: add returns the sum of two numbers.");
    assert(!artifact.includes(reviewRecord.commentary));
    assert.equal(reviewRecord.envelopeFenceRemoved, true);
    malformedReviewer = true;
    const rejectedResponse = await post({
      kind: "writing",
      prompt: "Return the deliverable only.",
      parentMissionId: job.id,
    });
    const rejected = await rejectedResponse.json();
    assert.equal(rejectedResponse.status, 202, JSON.stringify(rejected));
    const rejectedStatus = await until(
      async () => (await fetch(base + "/control/status")).json(),
      (s) =>
        !s.busy &&
        s.jobs.some((j: any) => j.id === rejected.id && j.status !== "running"),
    );
    assert.equal(
      rejectedStatus.jobs.find((j: any) => j.id === rejected.id).status,
      "failed",
    );
    assert.equal(
      await readFile(
        resolve(runtime, "missions", rejected.id, "reviewed.md"),
        "utf8",
      ),
      "",
    );
    const raw = await readFile(
      resolve(runtime, "missions", rejected.id, "exchanges.jsonl"),
      "utf8",
    );
    assert(raw.includes("Malformed reviewer response retained"));
    const failedSpool = await readFile(
      resolve(runtime, `spool-profile-proof-${rejected.id}.jsonl`),
      "utf8",
    );
    assert(!failedSpool.includes('"capability":"artifact.created"'));
    malformedRejected = true;
  }
  const output = resolve(
    root,
    "evidence/profile-missions",
    real ? "review-contract-real" : "review-contract-fixture",
  );
  await mkdir(output, { recursive: true });
  const proof = {
    scope: real
      ? "Real Ollama provider with SDK/Dispatch profile handoff"
      : "Synthetic provider and MCP response with real SDK/Dispatch profile handoff",
    model,
    mission: job.id,
    profiles: job.profiles,
    unsupportedCapabilityHTTP: refused.status,
    unauthorizedDocumentationHTTP: refusedTool.status,
    documentation: real
      ? realDocs
        ? {
            lifecycle: spool
              .filter((e) => e.capability === "mcp.call")
              .map((e) => ({
                phase: e.phase,
                outcome: e.outcome,
                profile: e.profile,
                metadata: e.metadata,
              })),
          }
        : "not requested"
      : {
          calls: docCalls.length,
          authorAndReviewerReceivedContext: true,
          metadataOnlySpool: true,
          lifecycleObserved: true,
        },
    sourceEvents: spool.length,
    profileIdentityObserved: true,
    handoffObserved: true,
    continuationPreservedAfterCatalogRemoval: real
      ? "fixture-tested"
      : continuationPreserved,
    reviewSeparated: true,
    fencedJsonEnvelopeAccepted: !real,
    malformedResponseRejected: real ? "fixture-tested" : malformedRejected,
    artifactSha256: createHash("sha256").update(artifact).digest("hex"),
    artifactQuality: "NOT_GRADED: runtime completion is not task acceptance",
    privateEvidence: runtime,
  };
  await writeFile(
    resolve(output, "proof.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  console.log(JSON.stringify(proof));
} finally {
  service.kill("SIGTERM");
  await new Promise<void>((r) => service.once("exit", () => r()));
  if (!real) await new Promise<void>((r) => provider.close(() => r()));
}
