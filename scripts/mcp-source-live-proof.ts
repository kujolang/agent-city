import { spawn } from "node:child_process";
import { mkdir, writeFile, open } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { prepareMcpProof } from "./prepare-mcp-proof";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/mcp-source-" + randomUUID());
await mkdir(runtime, { recursive: true, mode: 0o700 });
const token = randomBytes(24).toString("hex");
const endpoint = "http://127.0.0.1:19895/mcp/v1";
const mcp = await prepareMcpProof(resolve(runtime, "server"), 19895, token);
await writeFile(
  resolve(mcp, "demo/docs/project-guide.md"),
  "# Lantern service\nThe local Lantern service listens on port 7346.\nBack up its workspace before applying updates.\n",
  { mode: 0o600 },
);
const log = await open(resolve(runtime, "server.log"), "w", 0o600);
const server = spawn(
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
  ["run", "server.kujo", "--interpreter"],
  { cwd: mcp, stdio: ["ignore", log.fd, log.fd] },
);
await log.close();
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (
        await fetch(endpoint + "/health", {
          headers: { authorization: "Bearer " + token },
        })
      ).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(ready, "Owned MCP server did not start");
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/profile-mission-proof.ts"],
    {
      cwd: root,
      env: {
        ...process.env,
        CITY_PROFILE_PROOF_REAL: "1",
        CITY_PROFILE_PROOF_SOURCE_READS: "1",
        CITY_PROFILE_PROOF_MODEL: "glm-5.3:cloud",
        CITY_MAX_OUTPUT_TOKENS: "16384",
        CITY_MODEL_TIMEOUT_SECONDS: "180",
        CITY_PROFILE_PROOF_MCP_URL: endpoint,
        CITY_PROFILE_PROOF_MCP_TOKEN: token,
        CITY_PROFILE_PROOF_PROMPT:
          "Write a concise operator note (under 80 words) for the Lantern service using the explicitly approved docs/project-guide.md source. State its exact port and update precaution. Do not confuse the generic demo README with the Lantern source. Reviewer: preserve the facts and keep commentary under 80 words; use the required cityArtifact/cityReview JSON envelope.",
      },
      stdio: "inherit",
    },
  );
  const code = await new Promise((done, reject) => {
    child.once("error", reject);
    child.once("exit", done);
  });
  assert.equal(code, 0, "Live source mission failed; private attempt retained");
  console.log(
    JSON.stringify({
      scope: "Real local MCP file read and live Ollama author/reviewer",
      serverEvidence: runtime,
    }),
  );
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const exited = new Promise((r) => server.once("exit", r));
    server.kill("SIGTERM");
    await exited;
  }
}
