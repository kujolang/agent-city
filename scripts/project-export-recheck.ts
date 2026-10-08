/** Read-only verification of retained real execution. Never invokes a model/container. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { verifyWorkcellEvidence } from "../apps/runner/workcell-evidence";
import { readProjectOutputs } from "../apps/runner/project-exports";

const root = resolve(import.meta.dirname, "..");
const [runtimePath, mission, source] = process.argv.slice(2);
assert(
  runtimePath &&
    /^mission-[a-f0-9-]{36}$/.test(mission || "") &&
    /^[a-f0-9]{40}$/.test(source || ""),
);
const runtime = resolve(runtimePath);
const dir = resolve(runtime, "missions", mission);
const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));
// Verify the current business code matches the explicitly recorded execution revision.
execFileSync(
  "git",
  [
    "diff",
    "--exit-code",
    source,
    "HEAD",
    "--",
    "apps",
    "integrations",
    "packages",
    "scripts/mission.ts",
  ],
  { cwd: root, stdio: "pipe" },
);
const receipt = await json(resolve(dir, "receipt.json"));
const validation = await json(resolve(dir, "validation.json"));
const request = await json(resolve(dir, "request.json"));
const snapshot = await json(resolve(dir, "project-context.json"));
const record = await json(resolve(dir, "workcell.json"));
const workcell = await json(resolve(dir, "workcell/workcell-proof.json"));
assert.equal(receipt.id, mission);
assert.equal(receipt.status, "completed");
assert.equal(validation.syntax, "valid");
assert.equal(validation.outputCheck.status, "passed");
assert.equal(validation.outputCheck.actual, request.expectedOutput);
assert.equal(validation.codeExecuted, true);
assert.equal(record.status, "completed");
assert.equal(record.projectExportsStatus, "complete");
assert.equal(workcell.producer, receipt.producer);
assert.equal(workcell.run, record.run);
const evidence = await verifyWorkcellEvidence(
  resolve(dir, "workcell/workcell-source"),
  workcell.summary,
  [
    "city-result.txt",
    "runtime-version.txt",
    ...request.projectExports.map((path: string) => "project/" + path),
  ],
);
const outputs = await readProjectOutputs(
  dir,
  request.projectExports,
  evidence,
  request.workcellProjectInputs,
);
assert.deepEqual(outputs, record.projectOutputs);
assert.equal(
  outputs[0].content,
  snapshot.files[0].content + " / reviewed edit",
);
assert.equal(outputs[0].beforeSha256, snapshot.files[0].sha256);
assert.equal(outputs[0].change, "modified");
assert.equal(record.output, outputs[0].content + "\n");
const artifact = await readFile(resolve(dir, "reviewed.kujo"), "utf8");
assert(artifact.includes("read_file") && artifact.includes("write_file"));
assert(!artifact.includes(snapshot.files[0].content));
const spool = await readFile(
  resolve(runtime, `spool-${receipt.producer}.jsonl`),
  "utf8",
);
assert(!spool.includes(snapshot.files[0].content));
const events = spool
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
assert(
  events.some((e) => e.capability === "mcp.call" && e.outcome === "succeeded"),
);
assert(
  events.some(
    (e) =>
      e.kind === "handoff" &&
      e.phase === "finished" &&
      e.outcome === "succeeded",
  ),
);
assert(
  events.some(
    (e) => e.operation_id === "kujo-output-check" && e.outcome === "succeeded",
  ),
);
assert.deepEqual(
  events
    .filter(
      (e) =>
        e.capability === "artifact.created" && e.agent_id === "workcell-host",
    )
    .map((e) => e.metadata.artifactRef)
    .sort(),
  evidence.artifacts.map((a) => `workcell:${evidence.runId}:${a.name}`).sort(),
);
const diagnostics = (
  await readFile(resolve(dir, "provider-diagnostics.jsonl"), "utf8")
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
assert.equal(diagnostics.length, 2);
assert(
  diagnostics.every(
    (d) =>
      d.httpStatus === 200 &&
      d.finishReason === "stop" &&
      d.contentCharacters > 0,
  ),
);
const out = resolve(root, "evidence/mission-workcell/project-exports-real");
await mkdir(out, { recursive: true });
await writeFile(resolve(out, "reviewed.kujo"), artifact);
await writeFile(
  resolve(out, "proof.json"),
  JSON.stringify(
    {
      source,
      verificationSource: execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim(),
      scope:
        "Read-only verification of retained real model/SDK/MCP/Workcell project edit. No source rerun or mutation.",
      attempts: [
        {
          mission,
          validation,
          artifactSha256: createHash("sha256").update(artifact).digest("hex"),
          handoffObserved: true,
        },
      ],
      workcellRef: evidence.runId,
      projectOutputs: outputs,
      verifiedArtifactEvents: evidence.artifacts.length,
      providerResponses: diagnostics.map((d) => ({
        agent: d.agent,
        httpStatus: d.httpStatus,
        finishReason: d.finishReason,
      })),
      privateEvidence: runtime.slice(root.length + 1),
      checkedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Retained real project edit, exact exports, three artifact observations: PASS",
);
