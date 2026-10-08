import { workcellLaunchEnv } from "../apps/runner/workcell-settings";
/** Explicit CI qualification of the installed local sandbox, without a model. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { startupChecks, formatStartupChecks } from "./startup-checks";
import { boundedCommand } from "../apps/runner/bounded-command";
if (process.env.CITY_CI_WORKCELL_PROOF !== "1")
  throw Error(
    "Explicit CITY_CI_WORKCELL_PROOF=1 required; runs a local container",
  );
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/installed-workcell-proof");
await mkdir(runtime, { recursive: true, mode: 0o700 });
const output = resolve(
  process.env.CITY_WORKCELL_PROOF_OUTPUT || resolve(runtime, "proof.json"),
);
const proof: any = {
  scope:
    "Real installed Workcell execution of controlled arithmetic input; no model, no final tool demo",
  platform: process.platform,
  arch: process.arch,
  startedAt: new Date().toISOString(),
};
try {
  const savedEnv = await workcellLaunchEnv(resolve(root, ".runtime"));
  assert.equal(savedEnv.CITY_ENABLE_WORKCELL, "1");
  assert.match(savedEnv.CITY_WORKCELL_IMAGE || "", /^sha256:[a-f0-9]{64}$/);
  assert(savedEnv.DOCKER_CONTEXT);
  proof.savedSetupApplied = true;
  const startup = await startupChecks(
    root,
    process.env,
    process.versions.node,
    false,
  );
  assert(startup.ok, formatStartupChecks(startup));
  const image = JSON.parse(
    await readFile(resolve(root, ".runtime/workcell-image.json"), "utf8"),
  );
  assert.match(image.imageId, /^sha256:[0-9a-f]{64}$/);
  const input = resolve(runtime, "input.kujo");
  await writeFile(
    input,
    "func add(a, b) { return a + b }\nprint(add(12, 25))\n",
  );
  const run = await boundedCommand(
    process.execPath,
    ["--import", "tsx", "integrations/kujo/workcell.ts"],
    {
      cwd: root,
      env: {
        ...savedEnv,
        KUJO_BIN: startup.kujo,
        CITY_RUNTIME_DIR: runtime,

        CITY_WORKCELL_KUJO_FILE: input,
      },
      timeoutMs: 90000,
    },
  );
  assert.equal(run.timedOut, false);
  assert.equal(run.code, 0, run.output);
  const receipt = JSON.parse(
    await readFile(resolve(runtime, "workcell-proof.json"), "utf8"),
  );
  assert(receipt.evidence);
  assert.equal(receipt.evidenceError, null);
  const artifactRoot = resolve(
    runtime,
    "workcell-source/.workcell/runs",
    receipt.evidence.runId,
    "artifacts",
  );
  const result = await readFile(
    resolve(artifactRoot, "city-result.txt"),
    "utf8",
  );
  const version = await readFile(
    resolve(artifactRoot, "runtime-version.txt"),
    "utf8",
  );
  assert.equal(result.trim(), "37");
  assert.match(version, /kujo 1\.7\.0/);
  // Verify the invocation's receipt AND independently confirm no owned container remains.
  const containers = await boundedCommand(
    "docker",
    [
      "ps",
      "--all",
      "--filter",
      "label=dev.kujo.workcell.run_id=" + receipt.evidence.runId,
      "--format",
      "{{.ID}}",
    ],
    { cwd: root, timeoutMs: 5000 },
  );
  assert.equal(containers.code, 0, containers.output);
  assert.equal(containers.output.trim(), "");
  proof.image = image;
  proof.runId = receipt.evidence.runId;
  proof.evidence = receipt.evidence;
  proof.result = result.trim();
  proof.runtimeVersion = version.trim();
  proof.containerAbsent = true;
  // Exercise the actual mission API, SDK handoff, output failure and explicit repair.
  // Provider responses are controlled; both generated programs really run in Workcell.
  const outputCheck = await boundedCommand(
    process.execPath,
    ["--import", "tsx", "scripts/profile-code-proof.ts"],
    {
      cwd: root,
      timeoutMs: 300000,
      env: {
        ...savedEnv,
        KUJO_BIN: startup.kujo,
        CITY_ENABLE_WORKCELL: "1",

        CITY_PROFILE_PROOF_REAL: "0",
        CITY_PROFILE_PROOF_LANGUAGE: "kujo",
        CITY_PROFILE_PROOF_WORKCELL: "1",
        CITY_PROFILE_PROOF_OUTPUT_CHECK: "1",
      },
    },
  );
  assert.equal(outputCheck.timedOut, false);
  assert.equal(outputCheck.code, 0, outputCheck.output);
  proof.outputCheck = JSON.parse(
    await readFile(
      resolve(root, "evidence/mission-workcell/output-check/proof.json"),
      "utf8",
    ),
  );
  proof.status = "PASS";
} catch (error) {
  proof.status = "FAIL";
  proof.error = String(error);
  process.exitCode = 1;
} finally {
  proof.finishedAt = new Date().toISOString();
  await writeFile(output, JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof));
}
