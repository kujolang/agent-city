import { spawn } from "node:child_process";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";

/** Business-process receipt, independent of the HTTP controller and telemetry. */
export async function superviseMission(options: {
  directory: string;
  id: string;
  kind: string;
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}) {
  await mkdir(options.directory, { recursive: true, mode: 0o700 });
  const file = resolve(options.directory, "process-receipt.json");
  const startedAt = new Date().toISOString();
  const save = async (data: unknown) => {
    await writeFile(file + ".tmp", JSON.stringify(data), { mode: 0o600 });
    await rename(file + ".tmp", file);
  };
  await save({
    schema: "agent-city.mission-process.v1",
    id: options.id,
    kind: options.kind,
    status: "running",
    startedAt,
  });
  const child = spawn(options.executable, options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: "ignore",
  });
  const interrupt = () => child.kill("SIGINT"),
    terminate = () => child.kill("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    const outcome = await new Promise<{
      code: number | null;
      signal: string | null;
      spawnError?: string;
    }>((done) => {
      child.once("error", (e: NodeJS.ErrnoException) =>
        done({
          code: null,
          signal: null,
          spawnError: /^[A-Z0-9_]{1,32}$/.test(e.code || "")
            ? e.code
            : "SPAWN_ERROR",
        }),
      );
      child.once("exit", (code, signal) => done({ code, signal }));
    });
    await save({
      schema: "agent-city.mission-process.v1",
      id: options.id,
      kind: options.kind,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: outcome.code === 0 ? "completed" : "failed",
      ...outcome,
      scope: "mission-process-only",
    });
    return outcome.code === 0 ? 0 : 1;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
  }
}
