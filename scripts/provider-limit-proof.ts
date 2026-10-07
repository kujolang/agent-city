import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { providerDiagnostics } from "../apps/runner/provider-diagnostics";
const root = resolve(import.meta.dirname, "..");
const runtime = await mkdtemp(resolve(root, ".runtime/provider-limit-"));
const prompt = resolve(runtime, "task.txt");
await writeFile(prompt, "Return a short fixture draft.");
let calls = 0;
const provider = createServer((req, res) => {
  let body = "";
  req.on("data", (b) => (body += b));
  req.on("end", () => {
    const input = JSON.parse(body);
    assert.equal(input.max_tokens, 4096);
    calls++;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "length",
            message: {
              content: "Private partial draft",
              reasoning_content: "Private reasoning sentinel",
            },
          },
        ],
      }),
    );
  });
});
await new Promise<void>((r) => provider.listen(19895, "127.0.0.1", r));
const id = "mission-11111111-1111-4111-8111-111111111111";
try {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/mission.ts", "writing", prompt],
    {
      cwd: root,
      env: {
        ...process.env,
        CITY_MODEL_ENDPOINT: "http://127.0.0.1:19895/v1/chat/completions",
        CITY_MODEL: "limit-fixture",
        CITY_MODEL_API_KEY: "",
        CITY_MAX_OUTPUT_TOKENS: "4096",
        CITY_MISSION_ID: id,
        CITY_RUNTIME_DIR: runtime,
        CITY_MISSIONS_DIR: resolve(runtime, "missions"),
        CITY_PROFILE_FILE: "",
        CITY_USE_RAG: "0",
        CITY_USE_MCP: "0",
        CITY_FUNCTION_CONTRACT_FILE: "",
        CITY_CONTEXT_FILE: "",
      },
      stdio: "ignore",
    },
  );
  const exit = await new Promise<number | null>((r) => child.on("exit", r));
  assert.notEqual(exit, 0);
  assert.equal(calls, 1);
  const diagnostic = await providerDiagnostics(
    resolve(runtime, "missions"),
    id,
  );
  assert.equal(diagnostic.records[0].finishReason, "length");
  assert.equal(diagnostic.records[0].requestedMaxTokens, 4096);
  assert.equal(diagnostic.records[0].reasoningPresent, true);
  assert(!JSON.stringify(diagnostic).includes("Private"));
  const exchanges = await readFile(
    resolve(runtime, "missions", id, "exchanges.jsonl"),
    "utf8",
  );
  assert(exchanges.includes("Private partial draft"));
  assert(!exchanges.includes("Private reasoning sentinel"));
  const receipt = JSON.parse(
    await readFile(resolve(runtime, "missions", id, "receipt.json"), "utf8"),
  );
  assert.equal(receipt.status, "failed");
  await mkdir("evidence/provider-limits", { recursive: true });
  await writeFile(
    "evidence/provider-limits/fixture.json",
    JSON.stringify(
      {
        scope: "Controlled length-stop response with real SDK/Dispatch",
        exit,
        calls,
        diagnostic,
        partialContentRetainedPrivately: true,
        reasoningTextExcluded: true,
        runtimeStatus: receipt.status,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: length stop failed the mission; partial output retained; reasoning excluded",
  );
} finally {
  await new Promise<void>((r) => provider.close(() => r()));
}
