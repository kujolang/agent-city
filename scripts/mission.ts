import { validateModelConfig } from "../apps/runner/config";
import { checkCodeArtifact } from "../apps/runner/code-artifact";
import {
  checkFunctions,
  validateFunctionContract,
} from "../apps/runner/function-check";
import { checkObserver } from "../apps/runner/check-observer";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
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
await writeFile(resolve(dir, "exchanges.jsonl"), "", { mode: 0o600 });
const output = resolve(dir, kind === "code" ? "reviewed.mjs" : "reviewed.md");
await writeFile(output, "", { mode: 0o600 });
const producer = (process.env.CITY_SOURCE_PREFIX || "review-") + id;
if (producer.length > 80 || !/^[a-zA-Z0-9_.:-]+$/.test(producer))
  throw Error(
    "Source prefix must keep producer identity within 80 safe characters",
  );
async function writeReceipt(data: unknown) {
  await writeFile(resolve(dir, "receipt.tmp"), JSON.stringify(data, null, 2), {
    mode: 0o600,
  });
  await rename(resolve(dir, "receipt.tmp"), resolve(dir, "receipt.json"));
}
const startedAt = new Date().toISOString();
await writeReceipt({
  id,
  producer,
  kind,
  status: "running",
  startedAt,
  hostPid: process.pid,
});
const child = spawn(
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
  [
    "run",
    resolve(root, "integrations/kujo/dispatch-mission.kujo"),
    "--interpreter",
  ],
  {
    cwd: resolve(root, "../dispatch"),
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      KUJO_BIN:
        process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
      CITY_MISSION_ID: id,
      // Explicitly scoped to this generated private mission directory.
      DISPATCH_ALLOW_ANY_OUTPUT_ROOT: "true",
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
      CITY_SDK_EXAMPLE: resolve(root, "integrations/kujo/mission.kujo"),
      CITY_DISPATCH_ROOT: resolve(dir, "dispatch"),
      CITY_DISPATCH_RECEIPT: resolve(dir, "dispatch.json"),
      CITY_RUN: id,
      CITY_TASK: id + ":task",
      CITY_PRODUCER: producer,
      CITY_ACTOR: kind === "code" ? "coder" : "writer",
      CITY_MISSION_KIND: kind,
      CITY_PROMPT_FILE: resolve(dir, "task.txt"),
      CITY_OUTPUT_FILE: output,
      CITY_EXCHANGE_FILE: resolve(dir, "exchanges.jsonl"),
      CITY_SPOOL: resolve(
        root,
        process.env.CITY_RUNTIME_DIR || ".runtime",
        `spool-${producer}.jsonl`,
      ),
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
  const kill = (signal: NodeJS.Signals) => {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") child.kill(signal);
      else process.kill(-child.pid, signal);
    } catch {}
  };
  kill("SIGTERM");
  force ??= setTimeout(() => kill("SIGKILL"), 5000);
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
let validation:
  | (Omit<Awaited<ReturnType<typeof checkCodeArtifact>>, "codeExecuted"> & {
      codeExecuted: boolean | null;
    })
  | null = null;
if (code === 0 && kind === "code") {
  validation = await checkCodeArtifact(output);
  if (process.env.CITY_FUNCTION_CONTRACT_FILE) {
    const contract = validateFunctionContract(
      JSON.parse(
        await readFile(process.env.CITY_FUNCTION_CONTRACT_FILE, "utf8"),
      ),
    );
    await writeFile(
      resolve(dir, "function-contract.json"),
      JSON.stringify(contract),
      { mode: 0o600 },
    );
    const dispatch = JSON.parse(
      await readFile(resolve(dir, "dispatch.json"), "utf8"),
    );
    const observe = checkObserver(
      resolve(
        root,
        process.env.CITY_RUNTIME_DIR || ".runtime",
        `spool-${producer}.jsonl`,
      ),
      producer,
      dispatch.run_id,
      dispatch.run_id + ":produce-artifact",
    );
    await observe("run", "execution", "started", "unset");
    await observe("function-suite", "evaluation", "started", "unset");
    try {
      const functional = await checkFunctions(
        await readFile(output, "utf8"),
        contract,
      );
      await writeFile(
        resolve(dir, "functional.json"),
        JSON.stringify(functional, null, 2),
        { mode: 0o600 },
      );
      validation = {
        ...validation,
        functionalTests: functional.status,
        codeExecuted: true,
      };
      for (const [index, result] of functional.cases.entries())
        await observe(
          "check-" + index,
          "evaluation",
          "finished",
          result.status === "passed" ? "succeeded" : "failed",
          result.occurredAt,
        );
      await observe(
        "function-suite",
        "evaluation",
        "finished",
        functional.status === "passed" ? "succeeded" : "failed",
      );
      await observe("run", "execution", "finished", "succeeded");
    } catch {
      validation = {
        ...validation,
        functionalTests: "unavailable",
        codeExecuted: null,
      };
      await observe("function-suite", "evaluation", "finished", "failed");
      await observe("run", "execution", "finished", "failed");
    }
  }
  await writeFile(resolve(dir, "validation.json"), JSON.stringify(validation), {
    mode: 0o600,
  });
}
await writeReceipt({
  id,
  producer,
  kind,
  status: code === 0 ? "completed" : "failed",
  validation,
  code,
  startedAt,
  finishedAt: new Date().toISOString(),
  output: code === 0 ? output : null,
  execution:
    "Dispatch workflow, SDK model request and reviewer handoff; optional explicit browser checks recorded in validation",
});
if (code !== 0) {
  await writeFile(resolve(dir, "private-error.log"), diagnostic, {
    mode: 0o600,
  });
  throw Error(`Mission failed (${code}); private diagnostics: ${dir}`);
}
console.log(`Mission ${id} completed. Reviewed artifact: ${output}`);
