import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { boundedCommand } from "../apps/runner/bounded-command";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/workcell-cancel-" + Date.now());
await mkdir(runtime, { recursive: true, mode: 0o700 });
const input = resolve(runtime, "interrupt.kujo"),
  cancel = resolve(runtime, "cancel");
await writeFile(input, 'print("Cancellation proof entered")\nwhile true {}\n');
const producer = "review-cancel-" + Date.now();
const child = spawn(
  process.execPath,
  ["--import", "tsx", "integrations/kujo/workcell.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CITY_RUNTIME_DIR: runtime,
      CITY_PRODUCER: producer,
      CITY_WORKCELL_IMAGE:
        process.env.CITY_WORKCELL_IMAGE ||
        "kujolang/workcell-kujo:tribunal-kujo-1.5.0-cc2d7db",
      CITY_WORKCELL_KUJO_FILE: input,
      CITY_WORKCELL_CANCEL_FILE: cancel,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
child.stdout.on("data", (d) => {
  log = (log + d).slice(-65536);
});
child.stderr.on("data", (d) => {
  log = (log + d).slice(-65536);
});
const completion = new Promise<number | null>((ok, fail) => {
  child.once("exit", ok);
  child.once("error", fail);
});
const runs = resolve(runtime, "workcell-source/.workcell/runs");
let observedRun: string | null = null;
try {
  for (let i = 0; i < 100; i++) {
    const names = await readdir(runs).catch(() => []);
    for (const name of names.filter((n) => /^wc-[a-f0-9]{32}$/.test(n))) {
      const result = await boundedCommand(
        "docker",
        [
          "ps",
          "--filter",
          "label=dev.kujo.workcell.run_id=" + name,
          "--format",
          "{{.Names}}",
        ],
        { cwd: root, timeoutMs: 3000 },
      );
      if (
        result.code === 0 &&
        result.output.trim() === "kujo-workcell-" + name
      ) {
        observedRun = name;
        break;
      }
    }
    if (observedRun) break;
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(observedRun, "Own running container was not observed");
  const requestedAt = new Date().toISOString();
  await writeFile(cancel, "operator requested cancellation\n", { mode: 0o600 });
  const code = await completion;
  assert.notEqual(code, 0);
  const proof = JSON.parse(
    await readFile(resolve(runtime, "workcell-proof.json"), "utf8"),
  );
  assert.equal(proof.summary.run_id, observedRun);
  assert.equal(proof.summary.cancelled, true);
  const receipt = JSON.parse(
    await readFile(resolve(runs, observedRun, "receipt.json"), "utf8"),
  );
  assert.equal(receipt.cancelled, true);
  assert.equal(receipt.cleanup_status, "complete");
  assert.equal(
    await stat(receipt.workspace_path)
      .then(() => true)
      .catch(() => false),
    false,
  );
  const remaining = await boundedCommand(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      "label=dev.kujo.workcell.run_id=" + observedRun,
      "--format",
      "{{.Names}}",
    ],
    { cwd: root, timeoutMs: 3000 },
  );
  assert.equal(remaining.code, 0);
  assert.equal(remaining.output.trim(), "");
  const events = (
    await readFile(resolve(runtime, "spool-" + producer + ".jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert(!events.some((e) => e.capability === "artifact.created"));
  assert(
    events.some(
      (e) =>
        e.capability === "workcell.execute" &&
        e.phase === "finished" &&
        e.outcome === "failed",
    ),
  );
  const out = resolve(root, "evidence/mission-workcell/cancellation");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Real operator cancellation after observing own running container; bounded intentional loop, not model-generated workload",
        run: observedRun,
        requestedAt,
        adapterExit: code,
        workcellExit: proof.code,
        workloadExit: receipt.exit_code,
        finalStatus: receipt.final_status,
        cancelled: receipt.cancelled,
        cleanup: receipt.cleanup_status,
        workspaceRemoved: true,
        containerRemoved: true,
        noSuccessArtifactObserved: true,
        events,
        privateEvidence: runtime.slice(root.length + 1),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Real owned Workcell cancellation, retained failure, container/workspace cleanup: PASS",
  );
} finally {
  await writeFile(cancel, "cancel on harness exit\n", { mode: 0o600 });
  await completion;
  await writeFile(resolve(runtime, "private.log"), log, { mode: 0o600 });
}
