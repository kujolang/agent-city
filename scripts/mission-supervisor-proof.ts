import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { superviseMission } from "../apps/runner/mission-supervisor";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, ".."),
  runtime = resolve(root, ".runtime/supervisor-" + randomUUID());
const id = "mission-" + randomUUID(),
  control = resolve(runtime, "control"),
  missions = resolve(runtime, "missions"),
  directory = resolve(missions, id);
await mkdir(control, { recursive: true });
await mkdir(directory, { recursive: true });
assert(await portAvailable(19898));
await writeFile(
  resolve(control, "jobs.json"),
  JSON.stringify([
    {
      id,
      kind: "writing",
      status: "running",
      startedAt: new Date().toISOString(),
    },
  ]),
);
const launch = () =>
  spawn(process.execPath, ["--import", "tsx", "apps/runner/main.ts"], {
    cwd: root,
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "19898",
      CITY_CONTROL_DIR: control,
      CITY_MISSIONS_DIR: missions,
    },
    stdio: "ignore",
  });
async function status(expected: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const s = await (
        await fetch("http://127.0.0.1:19898/control/status", {
          signal: AbortSignal.timeout(500),
        })
      ).json();
      if (s.jobs[0]?.status === expected) return s;
    } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error("Status deadline");
}
async function stop(c: ChildProcess, signal: NodeJS.Signals) {
  if (c.exitCode !== null || c.signalCode !== null) return;
  const exited = new Promise((r) => c.once("exit", r));
  c.kill(signal);
  await exited;
}
let server = launch();
try {
  assert((await status("unknown")).busy);
  const work = superviseMission({
    directory,
    id,
    kind: "writing",
    executable: process.execPath,
    args: [
      "-e",
      'require("node:fs").writeFileSync("attempt.txt","one");setTimeout(()=>process.kill(process.pid,"SIGKILL"),300)',
    ],
    cwd: directory,
    env: process.env,
  });
  await stop(server, "SIGKILL");
  assert.equal(await work, 1);
  server = launch();
  const recovered = await status("failed");
  assert.equal(recovered.busy, false);
  assert.equal(
    await readFile(resolve(directory, "attempt.txt"), "utf8"),
    "one",
  );
  const processReceipt = JSON.parse(
    await readFile(resolve(directory, "process-receipt.json"), "utf8"),
  );
  assert.equal(processReceipt.signal, "SIGKILL");
  const out = resolve(root, "evidence/mission-supervisor");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Controlled real OS process termination + HTTP controller restart; no model or Workcell execution",
        mission: id,
        initialStatus: "unknown",
        recoveredStatus: recovered.jobs[0].status,
        queueUnblocked: !recovered.busy,
        processReceipt,
        sourceRerun: false,
        privateEvidence: runtime,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Controller restart reconciles observed process exit and unblocks queue: PASS",
  );
} finally {
  await stop(server, "SIGTERM");
}
