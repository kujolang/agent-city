/** Real local-engine setup/restart proof; no model or task submission. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { boundedCommand } from "../apps/runner/bounded-command";
import { localPorts } from "./local-ports";
if (!process.env.CITY_SETUP_PROOF_IMAGE || !process.env.DOCKER_CONTEXT)
  throw Error(
    "Select an existing trusted CITY_SETUP_PROOF_IMAGE and DOCKER_CONTEXT. No engine will be installed or started.",
  );
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/saved-workcell-" + Date.now());
const out = resolve(root, "evidence/saved-workcell");
await mkdir(out, { recursive: true });
const baseEnv: NodeJS.ProcessEnv = {
  ...process.env,
  CITY_RUNTIME_DIR: runtime,
  CITY_PORT_OFFSET: "12000",
};
delete baseEnv.CITY_ENABLE_WORKCELL;
delete baseEnv.CITY_WORKCELL_IMAGE;
const ports = localPorts(baseEnv);
const setup = async (args: string[]) => {
  const result = await boundedCommand(
    process.execPath,
    ["--import", "tsx", "scripts/setup-workcell.ts", ...args],
    { cwd: root, env: baseEnv, timeoutMs: 20_000 },
  );
  assert.equal(result.code, 0, result.output);
  assert.equal(result.timedOut, false);
};
const rows = [];
let child: ChildProcess | undefined;
let exited: Promise<void> | undefined;
async function stop() {
  if (!child || !exited) return;
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(Error("Owned launcher did not stop")),
        5000,
      ).unref();
    }),
  ]);
  child = undefined;
}
try {
  await setup(["--image", process.env.CITY_SETUP_PROOF_IMAGE!, "--enable"]);
  const saved = JSON.parse(
    await readFile(resolve(runtime, "workcell-settings.json"), "utf8"),
  );
  assert.match(saved.imageId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(saved.dockerContext, process.env.DOCKER_CONTEXT);
  for (const enabled of [true, false]) {
    if (!enabled) await setup(["--disable"]);
    const launchEnv = { ...baseEnv };
    delete launchEnv.DOCKER_CONTEXT;
    delete launchEnv.DOCKER_HOST;
    child = spawn(process.execPath, ["--import", "tsx", "scripts/start.ts"], {
      cwd: root,
      env: launchEnv,
      stdio: "ignore",
    });
    exited = new Promise<void>((resolveExit, reject) => {
      child!.once("exit", () => resolveExit());
      child!.once("error", reject);
    });
    let status: any;
    for (let i = 0; i < 200; i++) {
      if (child.exitCode !== null)
        throw Error("Owned launcher stopped before readiness");
      try {
        const r = await fetch(
          `http://127.0.0.1:${ports.control}/control/status`,
        );
        if (r.ok) {
          status = await r.json();
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(status);
    assert(status.workcellSetupCommand.includes(runtime));
    const check = await fetch(
      `http://127.0.0.1:${ports.control}/control/check-workcell`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: `http://127.0.0.1:${ports.web}`,
          "x-city-command-token": status.token,
        },
        body: "{}",
      },
    );
    assert.equal(check.status, 200);
    const result = (await check.json()) as any;
    assert.equal(result.available, enabled, result.message);
    assert.deepEqual(status.jobs, []);
    rows.push({
      savedEnabled: enabled,
      available: result.available,
      jobs: 0,
      setupCommandTargetsSameRuntime: true,
    });
    await stop();
  }
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Real Docker image inspection through normal City launcher, saved enable/disable with no environment grants, no provider/task execution",
        imageId: saved.imageId,
        context: saved.dockerContext,
        runtime,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(rows));
} finally {
  await stop();
}
