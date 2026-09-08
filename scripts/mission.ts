import { validateModelConfig } from "../apps/runner/config";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const [kind, promptFile] = process.argv.slice(2);
if (!["writing", "code"].includes(kind) || !promptFile)
  throw Error("Usage: npm run mission -- writing|code /path/to/task.txt");
validateModelConfig({
  endpoint: process.env.CITY_MODEL_ENDPOINT || "",
  model: process.env.CITY_MODEL || "",
  apiKey: process.env.CITY_MODEL_API_KEY || "",
});
const prompt = await readFile(resolve(promptFile), "utf8");
if (!prompt.trim() || Buffer.byteLength(prompt) > 16_384)
  throw Error("Task must contain 1–16,384 UTF-8 bytes.");
const id = process.env.CITY_MISSION_ID || "mission-" + randomUUID();
if (!/^mission-[0-9a-f-]{36}$/.test(id))
  throw Error("Invalid mission identity");
const dir = resolve(root, ".runtime/missions", id);
await mkdir(dir, { recursive: true, mode: 0o700 });
await writeFile(resolve(dir, "task.txt"), prompt, { mode: 0o600 });
const output = resolve(dir, kind === "code" ? "reviewed.mjs" : "reviewed.md");
await writeFile(output, "", { mode: 0o600 });
const producer = (process.env.CITY_SOURCE_PREFIX || "review-") + id;
if (producer.length > 80 || !/^[a-zA-Z0-9_.:-]+$/.test(producer))
  throw Error(
    "Source prefix must keep producer identity within 80 safe characters",
  );
const startedAt = new Date().toISOString();
await writeFile(
  resolve(dir, "receipt.json"),
  JSON.stringify({ id, producer, kind, status: "running", startedAt }),
  { mode: 0o600 },
);
const child = spawn(
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
  ["run", resolve(root, "integrations/kujo/mission.kujo"), "--interpreter"],
  {
    cwd: resolve(root, "../agents-sdk"),
    env: {
      ...process.env,
      CITY_RUN: id,
      CITY_TASK: id + ":task",
      CITY_PRODUCER: producer,
      CITY_ACTOR: kind === "code" ? "coder" : "writer",
      CITY_MISSION_KIND: kind,
      CITY_PROMPT_FILE: resolve(dir, "task.txt"),
      CITY_OUTPUT_FILE: output,
      CITY_SPOOL: resolve(root, `.runtime/spool-${producer}.jsonl`),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
// Drain without forwarding provider bodies or credentials into shared logs.
let diagnostic = "";
child.stdout.on("data", () => {});
child.stderr.on("data", (d) => {
  diagnostic = (diagnostic + d).slice(-8192);
});
let force: ReturnType<typeof setTimeout> | undefined;
const stop = () => {
  child.kill("SIGTERM");
  force ??= setTimeout(() => child.kill("SIGKILL"), 5000);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
const timer = setTimeout(stop, 240_000);
const code = await new Promise<number | null>((ok, fail) => {
  child.once("exit", ok);
  child.once("error", fail);
})
  .catch(() => null)
  .finally(() => {
    clearTimeout(timer);
    if (force) clearTimeout(force);
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  });
await writeFile(
  resolve(dir, "receipt.json"),
  JSON.stringify(
    {
      id,
      producer,
      kind,
      status: code === 0 ? "completed" : "failed",
      code,
      startedAt,
      finishedAt: new Date().toISOString(),
      output: code === 0 ? output : null,
      execution:
        "SDK model request and reviewer handoff; generated code is not executed",
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
if (code !== 0) {
  await writeFile(resolve(dir, "private-error.log"), diagnostic, {
    mode: 0o600,
  });
  throw Error(`Mission failed (${code}); private diagnostics: ${dir}`);
}
console.log(`Mission ${id} completed. Reviewed artifact: ${output}`);
