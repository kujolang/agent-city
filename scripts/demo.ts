import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
const root = resolve(import.meta.dirname, ".."),
  kujo = process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo");
const session = (process.env.CITY_SOURCE_PREFIX || "review-") + Date.now();
const receipts: unknown[] = [];
async function run(
  name: string,
  cwd: string,
  args: string[],
  extra: Record<string, string>,
) {
  let output = "";
  const p = spawn(kujo, args, {
    cwd,
    env: { ...process.env, KUJO_BIN: kujo, ...extra },
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", (d) => (output += d));
  p.stderr.on("data", (d) => (output += d));
  const code = await new Promise((r) => p.on("exit", r));
  receipts.push({ name, code, output });
  if (code !== 0) throw Error(name + " failed: " + output);
}
await run(
  "real SDK handoff and local retrieval",
  resolve(root, "../dispatch"),
  ["run", "examples/agent_city_observer.kujo", "--interpreter"],
  {
    CITY_HANDOFF: "1",
    CITY_PRODUCER: session + "-handoff",
    CITY_ACTOR: "scout",
    CITY_SPOOL: resolve(root, `.runtime/spool-${session}-handoff.jsonl`),
    CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
    RAG_URL: "http://127.0.0.1:8791",
  },
);
await run(
  "real Eval failure and repair",
  resolve(root, "../eval"),
  ["run", resolve(root, "integrations/kujo/evaluate.kujo"), "--interpreter"],
  {
    CITY_PRODUCER: session + "-eval",
    CITY_SPOOL: resolve(root, `.runtime/spool-${session}-eval.jsonl`),
    CITY_EVAL_ROOT: resolve(root, ".runtime"),
  },
);
await writeFile(
  resolve(root, "evidence/expansion-proof.json"),
  JSON.stringify({ session, receipts }, null, 2),
);
console.log("Real handoff / Eval failure-repair: PASS");
