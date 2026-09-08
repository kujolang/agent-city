import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { portAvailable } from "./startup-checks";

const root = resolve(import.meta.dirname, "..");
await mkdir(resolve(root, ".runtime"), { recursive: true });
const runtime = await mkdtemp(resolve(root, ".runtime/artifact-coverage-"));
const control = resolve(runtime, "control"),
  missions = resolve(runtime, "missions");
await mkdir(control);
await mkdir(missions);
const cases = [
  { id: "missing-receipt", receipt: undefined, expected: null },
  { id: "missing-flag", receipt: { syntax: "valid" }, expected: null },
  { id: "invalid-flag", receipt: { codeExecuted: "false" }, expected: null },
  {
    id: "explicit-not-executed",
    receipt: { codeExecuted: false },
    expected: false,
  },
  { id: "explicit-executed", receipt: { codeExecuted: true }, expected: true },
];
for (const c of cases) {
  const dir = resolve(missions, c.id);
  await mkdir(dir);
  await writeFile(
    resolve(dir, "reviewed.mjs"),
    'throw new Error("This fixture must never execute");\n',
  );
  if (c.receipt !== undefined)
    await writeFile(resolve(dir, "validation.json"), JSON.stringify(c.receipt));
}
await writeFile(
  resolve(control, "jobs.json"),
  JSON.stringify(
    cases.map((c) => ({
      id: c.id,
      kind: "code",
      status: "completed",
      task: "Synthetic artifact coverage fixture",
      startedAt: "2026-09-08T00:00:00Z",
    })),
  ),
);
const port = 18996;
assert(await portAvailable(port), "Isolated runner port occupied");
const child = spawn(
  process.execPath,
  ["--import", "tsx", "apps/runner/main.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      CITY_CONTROL_DIR: control,
      CITY_MISSIONS_DIR: missions,
      CITY_CONTROL_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
child.stdout.on("data", (d) => (log = (log + d).slice(-4000)));
child.stderr.on("data", (d) => (log = (log + d).slice(-4000)));
const results: unknown[] = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error(log);
    ready = await fetch(`http://127.0.0.1:${port}/control/status`, {
      signal: AbortSignal.timeout(500),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert(ready, "Runner not ready: " + log);
  for (const c of cases) {
    const response = await fetch(
      `http://127.0.0.1:${port}/control/artifact/${c.id}`,
      { signal: AbortSignal.timeout(2000) },
    );
    assert.equal(response.status, 200);
    const artifact = await response.json();
    assert.equal(artifact.codeExecuted, c.expected, c.id);
    results.push({ id: c.id, codeExecuted: artifact.codeExecuted });
  }
  await mkdir(resolve(root, "evidence/artifact-coverage"), { recursive: true });
  await writeFile(
    resolve(root, "evidence/artifact-coverage/proof.json"),
    JSON.stringify(
      {
        kind: "SYNTHETIC stored receipts through actual read-only artifact endpoint; no model or artifact execution",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Artifact execution coverage: PASS");
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((done) => {
    if (child.exitCode !== null || child.signalCode !== null) return done();
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      done();
    }, 2000);
    child.once("exit", () => {
      clearTimeout(timer);
      done();
    });
  });
}
