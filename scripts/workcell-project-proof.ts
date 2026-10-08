/** Actual container reads an explicitly staged snapshot; no model claim. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { executeMissionWorkcell } from "../apps/runner/mission-workcell";
import { projectContext } from "../apps/runner/project-context";

if (
  process.env.CITY_ENABLE_WORKCELL !== "1" ||
  !process.env.CITY_WORKCELL_IMAGE
)
  throw Error("Explicit Workcell setup required");
const root = resolve(import.meta.dirname, "..");
const directory = resolve(root, ".runtime/project-execution-" + randomUUID());
await mkdir(directory, { recursive: true, mode: 0o700 });
const artifact = resolve(directory, "reviewed.kujo");
await writeFile(artifact, 'print(read_file("project/inputs/message.txt"))\n');
const project = projectContext([
  { path: "inputs/message.txt", content: "actual selected project input" },
])!;
const record = await executeMissionWorkcell({
  root,
  directory,
  artifact,
  project,
  producer: "project-input-proof",
  run: "project-input-" + randomUUID(),
  spool: resolve(directory, "spool.jsonl"),
});
assert.equal(record.status, "completed");
assert.equal(record.codeExecuted, true);
assert.equal(record.output, "actual selected project input\n");
assert.equal(record.cleanup, "complete");
assert.deepEqual(
  record.projectInputs,
  project.files.map(({ content, ...ref }) => ref),
);
const lifecycle = await readFile(resolve(directory, "spool.jsonl"), "utf8");
assert(!lifecycle.includes(project.files[0].content));
assert(!lifecycle.includes("inputs/message.txt"));
const out = resolve(root, "evidence/mission-workcell/project-inputs");
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, "proof.json"),
  JSON.stringify(
    {
      scope:
        "Actual Workcell execution reads explicit snapshot; no model or browser claim",
      ...record,
      privateEvidence: directory.slice(root.length + 1),
      metadataOnlyLifecycle: true,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Actual project snapshot execution and metadata-only observation: PASS",
);
