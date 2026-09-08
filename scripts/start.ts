import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const kujo =
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo");
if (Number(process.versions.node.split(".")[0]) < 24)
  throw Error("Agent City requires Node 24 or newer");
for (const repo of ["agents-sdk", "dispatch", "watchdog", "rag", "eval", "mcp"])
  await access(resolve(root, "..", repo));
await access(kujo);
const occupied = await fetch("http://127.0.0.1:5178", {
  signal: AbortSignal.timeout(1000),
})
  .then(() => true)
  .catch(() => false);
if (occupied)
  throw Error(
    "Port 5178 is already in use. Stop the previous Agent City launcher with Ctrl+C, then start again. No existing process was stopped.",
  );
await mkdir(resolve(root, ".runtime"), { recursive: true });
async function run(
  command: string,
  args: string[],
  cwd: string,
  env = process.env,
) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  return await new Promise<number | null>((ok, fail) => {
    child.on("exit", ok);
    child.on("error", fail);
  });
}
try {
  await access(resolve(root, ".runtime/rag.json"));
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
    { ...process.env, KUJO_RAG_INDEX_PATH: resolve(root, ".runtime/rag.json") },
  );
  if (code !== 0) throw Error("Local knowledge index setup failed");
}
console.log(
  "Starting Agent City at http://127.0.0.1:5178. Configure your model in Mission Command. Ctrl+C stops the launcher.",
);
const code = await run(
  process.execPath,
  ["--import", "tsx", "scripts/local.ts"],
  root,
  { ...process.env, KUJO_BIN: kujo },
);
process.exitCode = code || 0;
