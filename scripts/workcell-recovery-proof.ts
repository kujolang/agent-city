import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readWorkcellRecord } from "../apps/runner/workcell-recovery";
const root = resolve(import.meta.dirname, "..");
const prior = JSON.parse(
  await readFile(
    resolve(root, "evidence/mission-workcell/real/proof.json"),
    "utf8",
  ),
);
const mission = prior.attempts[0].mission;
const source = resolve(
  root,
  prior.privateEvidence,
  "missions",
  mission,
  "workcell",
);
const original = JSON.parse(
  await readFile(resolve(source, "workcell-proof.json"), "utf8"),
);
const directory = resolve(root, ".runtime/workcell-recovery-" + randomUUID());
const runtime = resolve(directory, "workcell");
await mkdir(runtime, { recursive: true });
await cp(
  resolve(source, "workcell-proof.json"),
  resolve(runtime, "workcell-proof.json"),
);
await cp(
  resolve(source, "workcell-source/.workcell/runs", original.summary.run_id),
  resolve(runtime, "workcell-source/.workcell/runs", original.summary.run_id),
  { recursive: true },
);
const file = resolve(directory, "workcell.json");
await writeFile(
  file,
  JSON.stringify({
    schema: "agent-city.mission-workcell.v1",
    status: "pending",
    run: original.run,
    producer: original.producer,
    codeExecuted: null,
  }),
  { mode: 0o600 },
);
const before = await readFile(file);
const recovered = await readWorkcellRecord(directory);
assert.equal(recovered.status, "completed");
assert.equal(recovered.output, "5\n");
assert.equal(recovered.recovered, true);
assert.deepEqual(await readFile(file), before);
assert.deepEqual(await readWorkcellRecord(directory), recovered);
const out = resolve(root, "evidence/mission-workcell/recovery");
await mkdir(out, { recursive: true });
await writeFile(
  resolve(out, "proof.json"),
  JSON.stringify(
    {
      scope:
        "Simulated lost final checkpoint over copied real execution evidence; read-only recovery, no model/tool/container invocation",
      sourceMission: mission,
      sourceWorkcell: original.summary.run_id,
      recovered,
      checkpointUnchanged: true,
      repeatedReadIdentical: true,
      checkpointSha256: createHash("sha256").update(before).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log("Real retained receipt / simulated checkpoint loss recovery: PASS");
