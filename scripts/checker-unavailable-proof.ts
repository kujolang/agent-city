/** Controlled browser-launch failure; real SDK/Dispatch, no external model. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/checker-unavailable-" + randomUUID());
await mkdir(runtime, { recursive: true, mode: 0o700 });
assert(await portAvailable(19896));
const provider = createServer((req, res) => {
  req.resume();
  req.on("end", () =>
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: "export function add(a,b){return a+b}" },
          },
        ],
      }),
    ),
  );
});
await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
const address = provider.address() as { port: number };
const child = spawn(
  process.execPath,
  ["--import", "tsx", "apps/runner/main.ts"],
  {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "19896",
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_RUNTIME_DIR: runtime,
      CITY_MODEL_ENDPOINT: `http://127.0.0.1:${address.port}/v1/chat/completions`,
      CITY_MODEL: "checker-unavailable-fixture",
      CITY_MODEL_API_KEY: "",
      CHROMIUM_PATH: resolve(runtime, "missing-browser"),
    },
  },
);
async function status() {
  return (await fetch("http://127.0.0.1:19896/control/status")).json();
}
async function wait(check: (v: any) => boolean) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    try {
      const v = await status();
      if (check(v)) return v;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Owned checker proof timed out");
}
try {
  const ready = await wait((v) => Boolean(v.token));
  const response = await fetch("http://127.0.0.1:19896/control/missions", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:5178",
      "Content-Type": "application/json",
      "X-City-Command-Token": ready.token,
    },
    body: JSON.stringify({
      kind: "code",
      prompt: "Export add(a,b)",
      functionContract: {
        exportName: "add",
        cases: [{ name: "sum", args: [2, 3], equals: 5 }],
      },
    }),
  });
  assert.equal(response.status, 202);
  const { id } = await response.json();
  const final = await wait(
    (v) => v.jobs.find((j: any) => j.id === id)?.status === "completed",
  );
  const dir = resolve(runtime, "missions", id);
  const functional = JSON.parse(
    await readFile(resolve(dir, "functional.json"), "utf8"),
  );
  assert.equal(functional.status, "unavailable");
  assert.equal(functional.codeExecuted, null);
  assert.equal(functional.cases.length, 0);
  assert.match(functional.diagnostic, /missing-browser/);
  const events = (
    await readFile(resolve(runtime, `spool-review-${id}.jsonl`), "utf8")
  )
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert(
    events.some(
      (e) =>
        e.operation_id === "function-suite" &&
        e.phase === "finished" &&
        e.outcome === "unknown",
    ),
  );
  assert(
    !events.some(
      (e) => e.operation_id === "function-suite" && e.outcome === "failed",
    ),
  );
  const out = resolve(root, "evidence/checker-unavailable");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Controlled missing browser, real SDK/Dispatch; no generated code executed",
        mission: id,
        sourceStatus: final.jobs.find((j: any) => j.id === id).status,
        functional,
        unknownEvaluationObserved: true,
        privateEvidence: runtime,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: unavailable checker persisted, code execution unknown, no invented failed test",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((r) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      r();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      r();
    });
  });
  await new Promise<void>((r) => provider.close(() => r()));
}
