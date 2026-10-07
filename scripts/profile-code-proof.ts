import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { importCatalog, saveCatalog } from "../apps/runner/agent-catalog";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const real = process.env.CITY_PROFILE_PROOF_REAL === "1";
const kujo = process.env.CITY_PROFILE_PROOF_LANGUAGE === "kujo";
const workcell = kujo && process.env.CITY_PROFILE_PROOF_WORKCELL === "1";
const authorId = kujo
  ? "kujolang/kujo-agents:chain.frontend-developer"
  : "kujolang/kujo-agents:chain.integration-engineer";
const runtime = resolve(root, ".runtime", "profile-code-" + randomUUID());
await mkdir(runtime, { recursive: true });
await saveCatalog(
  resolve(runtime, "control/agent-catalog.json"),
  await importCatalog(resolve(root, "../kujo-agents")),
);
assert(await portAvailable(19894));
assert(await portAvailable(19895));
let repaired = false;
let calls = 0;
const provider = createServer((req, res) => {
  let body = "";
  req.on("data", (b) => (body += b));
  req.on("end", () => {
    const data = JSON.parse(body);
    calls++;
    const reviewer = data.messages.some(
      (m: any) => m.role === "system" && m.content.includes("# Code Reviewer"),
    );
    const code = kujo
      ? repaired || !reviewer
        ? "func add(a, b) { return a + b }\nprint(add(2, 3))\n"
        : "func broken( { invalid $$$"
      : `export function add(a, b) { return a ${repaired ? "+" : "-"} b; }`;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: reviewer
                ? JSON.stringify({
                    cityArtifact: code,
                    cityReview: "Controlled review; checks have not run yet.",
                  })
                : code,
            },
          },
        ],
      }),
    );
  });
});
if (!real)
  await new Promise<void>((r) => provider.listen(19895, "127.0.0.1", r));
const service = spawn(
  process.execPath,
  ["--import", "tsx", "apps/runner/main.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "19894",
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_RUNTIME_DIR: runtime,
      CITY_SOURCE_PREFIX: "profile-code-",
      CITY_MODEL_ENDPOINT: real
        ? "http://127.0.0.1:11434/v1/chat/completions"
        : "http://127.0.0.1:19895/v1/chat/completions",
      CITY_MODEL: real ? "glm-5.3:cloud" : "profile-code-fixture",
      CITY_MODEL_API_KEY: "",
      CITY_MAX_OUTPUT_TOKENS: real ? "8192" : "2048",
    },
    stdio: "ignore",
  },
);
async function until(
  fn: () => Promise<any>,
  check: (v: any) => boolean,
  ms = 30000,
) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (check(v)) return v;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw Error("Bounded profile code proof timed out");
}
const base = "http://127.0.0.1:19894";
const attempts: any[] = [];
try {
  const status = await until(
    async () => (await fetch(base + "/control/status")).json(),
    (v) => !!v.token,
  );
  const contract = {
    exportName: "add",
    cases: [
      { name: "positive", args: [2, 3], equals: 5 },
      { name: "negative", args: [-4, 1], equals: -3 },
      { name: "zero", args: [0, 0], equals: 0 },
    ],
  };
  for (let attempt = 0; attempt < (real ? 1 : 2); attempt++) {
    repaired = attempt === 1;
    const response = await fetch(base + "/control/missions", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5178",
        "Content-Type": "application/json",
        "X-City-Command-Token": status.token,
      },
      body: JSON.stringify({
        kind: kujo ? "kujo" : "code",
        executeWorkcell: workcell,
        prompt: kujo
          ? "Read the Kujo catalog using the requested MCP step. Write raw Kujo code defining func add(a,b) returning a+b and print(add(2,3)). Reviewer must return corrected raw Kujo code in cityArtifact and grade/review in cityReview. Do not claim execution; the platform will only syntax-check the final code."
          : "Write a raw JavaScript ES module exporting add(a,b), returning a+b. Reviewer must preserve the named export and return corrected code in cityArtifact. Do not claim tests passed; the platform will run the explicit cases after review.",
        profiles: {
          authorId,
          reviewerId: "kujolang/kujo-agents:chain.code-reviewer",
        },
        ...(kujo ? {} : { functionContract: contract }),
      }),
    });
    const accepted = await response.json();
    assert.equal(response.status, 202, JSON.stringify(accepted));
    const final = await until(
      async () => (await fetch(base + "/control/status")).json(),
      (v) =>
        v.jobs.some((j: any) => j.id === accepted.id && j.status !== "running"),
      240000,
    );
    const job = final.jobs.find((j: any) => j.id === accepted.id);
    assert.equal(job.status, "completed", JSON.stringify(job));
    const dir = resolve(runtime, "missions", job.id);
    const checks = kujo
      ? null
      : JSON.parse(await readFile(resolve(dir, "functional.json"), "utf8"));
    const validation = JSON.parse(
      await readFile(resolve(dir, "validation.json"), "utf8"),
    );
    const artifact = await readFile(
      resolve(dir, kujo ? "reviewed.kujo" : "reviewed.mjs"),
      "utf8",
    );
    const events = (
      await readFile(
        resolve(runtime, `spool-profile-code-${job.id}.jsonl`),
        "utf8",
      )
    )
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    const expected = real || repaired ? "passed" : "failed";
    if (kujo) {
      assert.equal(validation.syntax, real || repaired ? "valid" : "invalid");
      assert.equal(validation.checkedArtifact, "reviewed.kujo");
      assert.equal(validation.codeExecuted, workcell && (real || repaired));
      assert.equal(
        await readFile(resolve(dir, "reviewed.md"), "utf8"),
        artifact,
      );
      const api = await (
        await fetch(base + "/control/artifact/" + job.id)
      ).json();
      assert.equal(api.validation.checkedArtifact, "reviewed.kujo");
      assert.equal(api.content, artifact);
      if (workcell && (real || repaired)) {
        assert.equal(api.workcell.status, "completed");
        assert.equal(api.workcell.output, "5\n");
        assert(
          events.some(
            (e) =>
              e.capability === "workcell.execute" && e.outcome === "succeeded",
          ),
        );
        assert(
          events.filter(
            (e) =>
              e.capability === "artifact.created" &&
              e.agent_id === "workcell-host",
          ).length === 2,
        );
      }
      assert(
        events.some(
          (e) =>
            e.capability === "mcp.call" &&
            e.phase === "finished" &&
            e.outcome === "succeeded",
        ),
      );
    } else {
      assert.equal(checks.status, expected);
      assert.equal(validation.functionalTests, expected);
      assert.equal(validation.codeExecuted, true);
    }
    assert(events.some((e) => e.kind === "handoff" && e.phase === "finished"));
    const checker = events.filter(
      (e) => e.agent_id === (kujo ? "kujo-checker" : "function-checker"),
    );
    assert(checker.length >= (kujo ? 2 : 7));
    assert(
      checker.every(
        (e) =>
          e.profile === (kujo ? "city-kujo-checker" : "city-function-checker"),
      ),
    );
    const individual = checker.filter(
      (e) =>
        e.phase === "finished" &&
        (kujo
          ? e.operation_id === "kujo-static-check"
          : e.operation_id.startsWith("check-")),
    );
    assert.equal(individual.length, kujo ? 1 : 3);
    assert(events.some((e) => e.profile === authorId));
    assert(
      events.some(
        (e) => e.profile === "kujolang/kujo-agents:chain.code-reviewer",
      ),
    );
    attempts.push({
      mission: job.id,
      model: real ? "glm-5.3:cloud" : "controlled",
      checks,
      validation,
      artifactSha256: createHash("sha256").update(artifact).digest("hex"),
      checkerIdentityDistinct: true,
      individualOutcomes: individual.map((e) => ({
        operation: e.operation_id,
        outcome: e.outcome,
      })),
      handoffObserved: true,
    });
  }
  if (!real) {
    assert.equal(calls, 4);
    const first = JSON.parse(
      await readFile(
        resolve(
          runtime,
          "missions",
          attempts[0].mission,
          kujo ? "validation.json" : "functional.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      kujo ? first.syntax : first.status,
      kujo ? "invalid" : "failed",
    );
  }
  const out = resolve(
    root,
    workcell
      ? "evidence/mission-workcell"
      : kujo
        ? "evidence/profile-kujo"
        : "evidence/profile-code",
    real ? "real" : "fixture",
  );
  await mkdir(out, { recursive: true });
  const proof = {
    scope: workcell
      ? "Mission API author/reviewer, static check and explicit isolated Workcell execution; model mode recorded per attempt"
      : kujo
        ? real
          ? "Real Ollama cloud author/reviewer, real public Kujo MCP read and static check of final artifact; no generated code execution"
          : "Synthetic model outputs, real public Kujo MCP read and static check; no generated code execution"
        : real
          ? "Real Ollama cloud author/reviewer and actual sandboxed browser function execution"
          : "Synthetic model outputs with actual SDK handoff and sandboxed browser function execution",
    attempts,
    priorFailureRetained: real ? "fixture-tested" : true,
    privateEvidence: runtime,
  };
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  console.log(JSON.stringify(proof));
} finally {
  service.kill("SIGTERM");
  await new Promise<void>((r) => {
    const timer = setTimeout(() => {
      service.kill("SIGKILL");
      r();
    }, 3000);
    service.once("exit", () => {
      clearTimeout(timer);
      r();
    });
  });
  if (!real) await new Promise<void>((r) => provider.close(() => r()));
}
