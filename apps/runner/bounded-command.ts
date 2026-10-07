import { spawn } from "node:child_process";

/** Local runner only. A timeout never proves container cleanup or task completion. */
export function boundedCommand(
  executable: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    graceMs?: number;
  },
): Promise<{
  code: number | null;
  output: string;
  timedOut: boolean;
  spawnError?: string;
}> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const graceMs = options.graceMs ?? 5_000;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isFinite(graceMs) ||
    graceMs < 0
  )
    throw Error("Invalid process time limit");
  return new Promise((done) => {
    let output = "",
      timedOut = false,
      settled = false;
    let escalation: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const signal = (value: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid)
          process.kill(-child.pid, value);
        else child.kill(value);
      } catch {
        /* The owned process may already have exited. */
      }
    };
    const finish = (code: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      if (timedOut) signal("SIGKILL");
      clearTimeout(deadline);
      if (escalation) clearTimeout(escalation);
      done({ code, output, timedOut, ...(spawnError ? { spawnError } : {}) });
    };
    const deadline = setTimeout(() => {
      timedOut = true;
      signal("SIGTERM");
      escalation = setTimeout(() => {
        signal("SIGKILL");
        // A descendant can keep inherited pipes open. Bound waiting for them too.
        child.stdout.destroy();
        child.stderr.destroy();
        finish(null);
      }, graceMs);
    }, timeoutMs);
    child.stdout.on("data", (data) => {
      output = (output + data).slice(-131072);
    });
    child.stderr.on("data", (data) => {
      output = (output + data).slice(-131072);
    });
    child.once("error", (error: NodeJS.ErrnoException) =>
      finish(null, error.code || "SPAWN_ERROR"),
    );
    child.once("close", (code) => finish(code));
  });
}
