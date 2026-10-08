/** Controlled slow provider; real SDK/Dispatch, never product proof. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const runtime = await mkdtemp(resolve(root, ".runtime/provider-timeout-"));
const task = resolve(runtime, "task.txt");
await writeFile(task, "Return a short fixture draft.");
let calls = 0;
let attemptCalls = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
const server = createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    calls++;
    attemptCalls++;
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        if (!res.destroyed) {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              choices: [
                {
                  finish_reason: "stop",
                  message: { content: "Controlled provider draft." },
                },
              ],
            }),
          );
        }
      },
      attemptCalls === 1 ? 12000 : 0,
    );
    timers.add(timer);
  });
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as any).port;
const results = [];
try {
  for (const [limit, suffix, expected] of [
    [10, "1", "failed"],
    [20, "2", "completed"],
  ] as const) {
    attemptCalls = 0;
    const id = `mission-11111111-1111-4111-8111-11111111111${suffix}`;
    const started = Date.now();
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "scripts/mission.ts", "writing", task],
      {
        cwd: root,
        stdio: "ignore",
        env: {
          ...process.env,
          CITY_MODEL_ENDPOINT: `http://127.0.0.1:${port}/v1/chat/completions`,
          CITY_MODEL: "slow-fixture",
          CITY_MODEL_API_KEY: "",
          CITY_MODEL_TIMEOUT_SECONDS: String(limit),
          CITY_MAX_OUTPUT_TOKENS: "2048",
          CITY_MISSION_ID: id,
          CITY_RUNTIME_DIR: runtime,
          CITY_MISSIONS_DIR: resolve(runtime, "missions"),
          CITY_PROFILE_FILE: "",
          CITY_USE_RAG: "0",
          CITY_USE_MCP: "0",
          CITY_CONTEXT_FILE: "",
          CITY_FUNCTION_CONTRACT_FILE: "",
          CITY_CHECKINS: "0",
        },
      },
    );
    const exit = await new Promise<number | null>((r, j) => {
      child.on("exit", r);
      child.on("error", j);
    });
    const receipt = JSON.parse(
      await readFile(resolve(runtime, "missions", id, "receipt.json"), "utf8"),
    );
    assert.equal(receipt.status, expected);
    assert.equal(exit === 0, expected === "completed");
    assert.equal(attemptCalls, expected === "completed" ? 2 : 1);
    results.push({
      id,
      requestTimeoutSeconds: limit,
      status: receipt.status,
      calls: attemptCalls,
      elapsedMs: Date.now() - started,
    });
  }
  assert.equal(calls, 3);
  await mkdir("evidence/provider-timeout", { recursive: true });
  await writeFile(
    "evidence/provider-timeout/controlled.json",
    JSON.stringify(
      {
        status: "PASS",
        scope:
          "Controlled 12-second provider response; actual SDK/Dispatch; not real model product proof",
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: 10-second timeout fails; explicit 20-second wait completes author and reviewer; both retained",
  );
} finally {
  for (const timer of timers) clearTimeout(timer);
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
}
