/** Real SDK/Dispatch with a controlled provider; supervisor loss is not task failure. */
import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/supervisor-loss-" + randomUUID());
await mkdir(runtime, { recursive: true });
const port = 19908;
assert(await portAvailable(port));
const url = `http://127.0.0.1:${port}`;
let calls = 0,
  release!: () => void;
const held = new Promise<void>((r) => (release = r));
const provider = createServer((req, res) => {
  req.resume();
  req.on("end", async () => {
    calls++;
    if (calls === 1) await held;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: "Controlled source draft and review." },
          },
        ],
      }),
    );
  });
});
await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
const providerPort = (provider.address() as any).port;
const controller = spawn(
  process.execPath,
  ["--import", "tsx", "apps/runner/main.ts"],
  {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      CITY_CONTROL_PORT: String(port),
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_RUNTIME_DIR: runtime,
      CITY_MODEL_ENDPOINT: "",
      CITY_MODEL: "",
    },
  },
);
async function until<T>(
  read: () => Promise<T>,
  accept: (v: T) => boolean,
  ms = 30000,
): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const value = await read();
      if (accept(value)) return value;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Proof deadline");
}
const status = async () => {
  const r = await fetch(url + "/control/status", {
    signal: AbortSignal.timeout(1000),
  });
  assert(r.ok);
  return r.json();
};
let mission = "";
try {
  const initial = await until(status, () => true);
  const post = async (path: string, data: any) =>
    fetch(url + path, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5178",
        "Content-Type": "application/json",
        "X-City-Command-Token": initial.token,
      },
      body: JSON.stringify(data),
    });
  assert.equal(
    (
      await post("/control/config", {
        endpoint: `http://127.0.0.1:${providerPort}/v1/chat/completions`,
        model: "controlled-supervisor-loss",
        apiKey: "",
        maxOutputTokens: 2048,
        requestTimeoutSeconds: 60,
      })
    ).status,
    200,
  );
  const accepted = await post("/control/missions", {
    kind: "writing",
    prompt: "Return a short draft for separate review.",
    allowCheckins: false,
    useLocalDocs: false,
    useMcpDocs: false,
    executeWorkcell: false,
  });
  assert.equal(accepted.status, 202);
  mission = (await accepted.json()).id;
  await until(
    async () => calls,
    (n) => n === 1,
  );
  const rows = (await promisify(execFile)("ps", ["-axo", "pid=,ppid="])).stdout
    .trim()
    .split("\n")
    .map((s) => s.trim().split(/\s+/).map(Number));
  const runningReceipt = JSON.parse(
    await readFile(
      resolve(runtime, "missions", mission, "receipt.json"),
      "utf8",
    ),
  );
  const sourceRow = rows.find(([pid]) => pid === runningReceipt.hostPid);
  assert(sourceRow, "Owned mission process must still exist");
  const supervisorPid = sourceRow[1];
  assert(
    rows.some(
      ([pid, ppid]) => pid === supervisorPid && ppid === controller.pid,
    ),
    "Mission parent must be our controller's child",
  );
  process.kill(supervisorPid, "SIGKILL");
  const unknown = await until(
    status,
    (s) => s.jobs.find((j: any) => j.id === mission)?.status === "unknown",
  );
  const unknownJob = unknown.jobs.find((j: any) => j.id === mission);
  assert.equal(unknownJob.finishedAt, undefined);
  assert.equal(unknownJob.processOutcome.signal, "SIGKILL");
  assert(unknown.busy);
  assert.equal(
    (
      await post("/control/missions", {
        kind: "writing",
        prompt: "Do not admit while original outcome is unknown.",
      })
    ).status,
    409,
  );
  assert.equal(calls, 1);
  release();
  const recovered = await until(
    status,
    (s) => s.jobs.find((j: any) => j.id === mission)?.status === "completed",
    60000,
  );
  assert(!recovered.busy);
  assert.equal(recovered.jobs.length, 1);
  assert.equal(calls, 2);
  const receipt = JSON.parse(
    await readFile(
      resolve(runtime, "missions", mission, "receipt.json"),
      "utf8",
    ),
  );
  assert.equal(receipt.status, "completed");
  assert.equal(receipt.code, 0);
  const out = resolve(root, "evidence/supervisor-loss");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        status: "PASS",
        scope:
          "Controlled provider, actual SDK/Dispatch; owned supervisor SIGKILL while author response held; no real model product claim",
        mission,
        states: ["running", "unknown", "completed"],
        unknownJob,
        terminalJob: recovered.jobs[0],
        queueHeldWhileUnknown: true,
        queueReleasedOnReceipt: true,
        providerCalls: calls,
        missionCount: recovered.jobs.length,
        sourceRerun: false,
        receipt,
        privateEvidence: runtime,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: supervisor loss retains UNKNOWN, refuses overlap, then reconciles child completion without rerun",
  );
} finally {
  release();
  if (controller.exitCode === null && controller.signalCode === null) {
    const exited = new Promise((r) => controller.once("exit", r));
    controller.kill("SIGTERM");
    await exited;
  }
  provider.closeAllConnections();
  await new Promise<void>((r) => provider.close(() => r()));
}
