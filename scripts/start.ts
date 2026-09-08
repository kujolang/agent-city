import { localPorts, localRuntime } from "./local-ports";
import { startupChecks, formatStartupChecks } from "./startup-checks";
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const check = await startupChecks(root);
if (!check.ok) {
  console.error(formatStartupChecks(check));
  process.exit(1);
}
const kujo = check.kujo;
const ports = localPorts();
const runtime = localRuntime(root);
await mkdir(runtime, { recursive: true });
async function run(
  command: string,
  args: string[],
  cwd: string,
  env = process.env,
) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  return await new Promise<number | null>((ok, fail) => {
    const interrupt = () => child.kill("SIGINT"),
      terminate = () => child.kill("SIGTERM");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    const cleanup = () => {
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", terminate);
    };
    child.on("exit", (code) => {
      cleanup();
      ok(code);
    });
    child.on("error", (error) => {
      cleanup();
      fail(error);
    });
  });
}
try {
  await access(resolve(runtime, "rag__agent-city.json"));
} catch {
  const code = await run(
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "ingest",
      "--path",
      "./examples/kujo_docs",
      "--recursive",
      "true",
      "--namespace",
      "agent-city",
    ],
    resolve(root, "../rag"),
    { ...process.env, KUJO_RAG_INDEX_PATH: resolve(runtime, "rag.json") },
  );
  if (code !== 0) throw Error("Local knowledge index setup failed");
}
console.log(
  `Starting Agent City at http://127.0.0.1:${ports.web}. Configure your model in Mission Command. Ctrl+C stops the launcher.`,
);
const code = await run(
  process.execPath,
  ["--import", "tsx", "scripts/local.ts"],
  root,
  { ...process.env, KUJO_BIN: kujo },
);
process.exitCode = code ?? 1;
