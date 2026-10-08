/** Real Kujo SDK execution against a controlled provider; NOT product/model proof. */
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { importCatalog } from "../apps/runner/agent-catalog";
import {
  runVideoopsStage,
  admitVideoopsStage,
} from "../apps/runner/videoops-stage";
import { videoopsOutputs } from "../apps/runner/videoops-artifacts";
const root = resolve(import.meta.dirname, "..");
const workspace = resolve(
  root,
  ".runtime/videoops-stage-fixture-" + Date.now(),
);
await mkdir(workspace, { recursive: true, mode: 0o700 });
const profile = (
  await importCatalog(resolve(root, "../kujo-agents"))
).profiles.find((p) => p.sourceId === "videoops.creative-director")!;
assert(profile);
assert.throws(
  () => admitVideoopsStage(profile, "creative-director", []),
  /Unestablished/,
);
const capabilities = profile.capabilities.required.map((capability) => ({
  capability,
  evidenceRef: "fixture:bounded-stage-contract",
  authority: "runtime" as const,
}));
let calls = 0,
  release = () => {};
const barrier = new Promise<void>((ok) => {
  release = ok;
});
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => {
    body += c;
  });
  req.on("end", async () => {
    const request = JSON.parse(body);
    assert.equal(request.model, "explicit-fixture");
    calls++;
    if (calls === 1) await barrier;
    const bundle = {
      schema: "agent-city.videoops-artifacts.v1",
      files: videoopsOutputs["creative-director"].map((path) => ({
        path,
        content: path.endsWith(".json")
          ? "{}"
          : "Controlled fixture; not production work",
      })),
    };
    const content =
      calls === 2 ? "invalid artifact JSON" : JSON.stringify(bundle);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              role: "assistant",
              content,
              ...(calls === 3
                ? {
                    tool_calls: [
                      {
                        id: "ungranted",
                        function: { name: "shell", arguments: "{}" },
                      },
                    ],
                  }
                : {}),
            },
          },
        ],
      }),
    );
  });
});
await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
const address = server.address();
assert(address && typeof address !== "string");
const base = {
  root,
  workspace,
  stage: "creative-director" as const,
  producer: "videoops-fixture",
  run: "fixture-run",
  task: "fixture-task",
  profile,
  capabilities,
  instructions: "Controlled contract fixture only",
  input: "Return fixture artifacts",
  spool: resolve(workspace, "spool.jsonl"),
  model: {
    endpoint: `http://127.0.0.1:${address.port}/v1/chat/completions`,
    model: "explicit-fixture",
    apiKey: "",
    requestTimeoutSeconds: 10,
    maxOutputTokens: 2048,
  },
};
try {
  const running = runVideoopsStage({ ...base, attempt: 1 });
  // Observe actual start while controlled provider completion is held.
  let started = false;
  for (let i = 0; i < 100; i++) {
    try {
      started = (await readFile(base.spool, "utf8")).includes(
        '"phase":"started"',
      );
    } catch {}
    if (started) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(started, "SDK start must precede controlled provider completion");
  release();
  const first = await running;
  assert.equal(first.receipt.status, "artifacts-stored");
  assert.equal(first.receipt.productionApproval, "NOT_ESTABLISHED");
  await assert.rejects(runVideoopsStage({ ...base, attempt: 1 }));
  assert.equal(calls, 1, "Duplicate attempt must not call provider");
  const invalid = await runVideoopsStage({ ...base, attempt: 2 });
  assert.equal(invalid.receipt.status, "failed");
  const tool = await runVideoopsStage({ ...base, attempt: 3 });
  assert.equal(tool.receipt.status, "failed");
  const rows = (await readFile(base.spool, "utf8"))
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  assert(rows.some((r) => r.attempt === 3 && r.outcome === "failed"));
  assert(
    rows.some(
      (r) =>
        r.operation_id === "creative-director-artifact-contract-2" &&
        r.outcome === "failed",
    ),
  );
  assert.equal(
    rows.some((r) => JSON.stringify(r).includes("Controlled fixture;")),
    false,
  );
  const out = resolve(root, "evidence/videoops-stage-contract");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        schema: "agent-city.videoops-stage-proof.v1",
        scope:
          "Actual SDK, synthetic provider; not real model production proof",
        startBeforeControlledCompletion: started,
        duplicateProviderCalls: 0,
        providerCalls: calls,
        valid: first.receipt,
        invalid: invalid.receipt,
        ungrantedTool: tool.receipt,
        lifecycleRows: rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("VideoOps SDK stage contract: PASS");
} finally {
  release();
  server.closeAllConnections();
  await new Promise<void>((ok) => server.close(() => ok()));
}
