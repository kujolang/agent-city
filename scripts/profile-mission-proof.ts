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
const requests: any[] = [];
const provider = createServer((req, res) => {
  let body = "";
  req.on("data", (b) => (body += b));
  req.on("end", () => {
    requests.push(JSON.parse(body));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                requests.length === 1
                  ? "Draft: add returns the sum of two numbers."
                  : "Reviewed: add returns the sum of two numbers.",
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
      CITY_MODEL: real ? "qwen2.5-coder:1.5b-instruct" : "profile-fixture",
      CITY_MODEL_API_KEY: "",
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
  };
  const refused = await post({
    ...task,
    profiles: {
      ...profiles,
      authorId: "kujolang/kujo-agents:webops.webops-reporter",
    },
  });
  assert.equal(refused.status, 400);
  const refusedTool = await post({ ...task, useMcpDocs: true });
  assert.equal(refusedTool.status, 400);
  const response = await post(task);
  const accepted = await response.json();
  assert.equal(response.status, 202, JSON.stringify(accepted));
  const final = await until(
    async () => (await fetch(base + "/control/status")).json(),
    (s) =>
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
  if (!real) {
    assert.equal(requests.length, 2);
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
  const artifact = await readFile(
    resolve(runtime, "missions", job.id, "reviewed.md"),
    "utf8",
  );
  assert(artifact.trim());
  const output = resolve(
    root,
    "evidence/profile-missions",
    real ? "real" : "fixture",
  );
  await mkdir(output, { recursive: true });
  const proof = {
    scope: real
      ? "Real local Ollama model with SDK/Dispatch profile handoff"
      : "Synthetic provider with real SDK/Dispatch profile handoff",
    model: real ? "qwen2.5-coder:1.5b-instruct" : "profile-fixture",
    mission: job.id,
    profiles: job.profiles,
    unsupportedCapabilityHTTP: refused.status,
    unconnectedToolHTTP: refusedTool.status,
    sourceEvents: spool.length,
    profileIdentityObserved: true,
    handoffObserved: true,
    continuationPreservedAfterCatalogRemoval: real
      ? "fixture-tested"
      : continuationPreserved,
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
