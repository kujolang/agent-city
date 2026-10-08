import { admitWorkcellProject } from "../apps/runner/workcell-project";
import {
  projectContext,
  projectReferences,
} from "../apps/runner/project-context";
import {
  validateExpectedOutput,
  checkExpectedOutput,
} from "../apps/runner/output-check";
import {
  admitWorkcell,
  executeMissionWorkcell,
} from "../apps/runner/mission-workcell";
import {
  readBinding,
  bindingMetadata,
  validateProfileMission,
} from "../apps/runner/profile-binding";
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
if (!["writing", "code", "kujo"].includes(kind) || !promptFile)
  throw Error("Usage: npm run mission -- writing|code|kujo /path/to/task.txt");
const executeWorkcell = admitWorkcell(
  process.env.CITY_EXECUTE_WORKCELL === "1",
  kind,
);
const expectedOutput = validateExpectedOutput(
  process.env.CITY_OUTPUT_CONTRACT_FILE
    ? JSON.parse(await readFile(process.env.CITY_OUTPUT_CONTRACT_FILE, "utf8"))
    : undefined,
  kind,
  executeWorkcell,
);
const modelConfig = validateModelConfig({
  endpoint: process.env.CITY_MODEL_ENDPOINT || "",
  model: process.env.CITY_MODEL || "",
  apiKey: process.env.CITY_MODEL_API_KEY || "",
  maxOutputTokens: Number(process.env.CITY_MAX_OUTPUT_TOKENS || 2048),
  requestTimeoutSeconds: Number(process.env.CITY_MODEL_TIMEOUT_SECONDS || 90),
});
const prompt = await readFile(resolve(promptFile), "utf8");
if (!prompt.trim() || Buffer.byteLength(prompt) > 16_384)
  throw Error("Task must contain 1–16,384 UTF-8 bytes.");
const id = process.env.CITY_MISSION_ID || "mission-" + randomUUID();
if (!/^mission-[0-9a-f-]{36}$/.test(id))
  throw Error("Invalid mission identity");
const dir = resolve(
  process.env.CITY_MISSIONS_DIR || resolve(root, ".runtime/missions"),
  id,
);
await mkdir(dir, { recursive: true, mode: 0o700 });
let profiles = null;
if (process.env.CITY_PROFILE_FILE) {
  profiles = await readBinding(process.env.CITY_PROFILE_FILE);
  validateProfileMission(profiles, {
    kind,
    useLocalDocs: process.env.CITY_USE_RAG === "1",
    useMcpDocs: process.env.CITY_USE_MCP === "1",
    functionContract: process.env.CITY_FUNCTION_CONTRACT_FILE || undefined,
  });
  await writeFile(resolve(dir, "profiles.json"), JSON.stringify(profiles), {
    mode: 0o600,
  });
}
let context: any = null;
if (process.env.CITY_CONTEXT_FILE) {
  const body = await readFile(process.env.CITY_CONTEXT_FILE, "utf8");
  if (Buffer.byteLength(body) > 131_072)
    throw Error("Continuation context too large");
  context = JSON.parse(body);
  if (
    context.schema !== "agent-city.continuation.v1" ||
    !/^mission-[0-9a-f-]{36}$/.test(context.parentMissionId) ||
    !/^mission-[0-9a-f-]{36}$/.test(context.rootMissionId) ||
    typeof context.originalTask !== "string"
  )
    throw Error("Invalid continuation context");
  await writeFile(resolve(dir, "context.json"), body, { mode: 0o600 });
}
const selectedProject = process.env.CITY_PROJECT_CONTEXT_FILE
  ? JSON.parse(await readFile(process.env.CITY_PROJECT_CONTEXT_FILE, "utf8"))
  : context?.previousProject;
const project = projectContext(selectedProject?.files);
const workcellProject = admitWorkcellProject(
  process.env.CITY_WORKCELL_PROJECT_INPUTS === "1",
  executeWorkcell,
  project?.files,
);
if (project)
  await writeFile(
    resolve(dir, "project-context.json"),
    JSON.stringify(project),
    { mode: 0o600 },
  );
await writeFile(
  resolve(dir, "request.json"),
  JSON.stringify({
    prompt,
    executeWorkcell,
    expectedOutput,
    projectFiles: projectReferences(project),
    workcellProjectInputs: projectReferences(workcellProject),
    profiles: profiles ? bindingMetadata(profiles) : null,
    originalTask: context?.originalTask ?? prompt,
    rootMissionId: context?.rootMissionId ?? id,
    parentMissionId: context?.parentMissionId ?? null,
  }),
  { mode: 0o600 },
);
const requestedContract = process.env.CITY_FUNCTION_CONTRACT_FILE
  ? validateFunctionContract(
      JSON.parse(
        await readFile(process.env.CITY_FUNCTION_CONTRACT_FILE, "utf8"),
      ),
    )
  : null;
if (requestedContract) {
  if (kind !== "code") throw Error("Function checks require code");
  await writeFile(
    resolve(dir, "function-contract.json"),
    JSON.stringify(requestedContract),
    { mode: 0o600 },
  );
}
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
      CITY_MAX_OUTPUT_TOKENS: String(modelConfig.maxOutputTokens ?? 2048),
      CITY_MODEL_TIMEOUT_SECONDS: String(
        modelConfig.requestTimeoutSeconds ?? 90,
      ),
      CITY_PROFILE_FILE: profiles ? resolve(dir, "profiles.json") : "",
      CITY_AUTHOR_PROFILE:
        profiles?.author.id ||
        (kind === "writing" ? "city-writer" : "city-coder"),
      CITY_CONTEXT_FILE: context ? resolve(dir, "context.json") : "",
      CITY_PROJECT_CONTEXT_FILE: project
        ? resolve(dir, "project-context.json")
        : "",
      CITY_FUNCTION_CONTRACT_FILE: requestedContract
        ? resolve(dir, "function-contract.json")
        : "",
      // Explicitly scoped to this generated private mission directory.
      DISPATCH_ALLOW_ANY_OUTPUT_ROOT: "true",
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
      CITY_SDK_EXAMPLE: resolve(root, "integrations/kujo/mission.kujo"),
      CITY_DISPATCH_ROOT: resolve(dir, "dispatch"),
      CITY_DISPATCH_RECEIPT: resolve(dir, "dispatch.json"),
      CITY_RUN: id,
      CITY_TASK: id + ":task",
      CITY_PRODUCER: producer,
      CITY_ACTOR: kind === "writing" ? "writer" : "coder",
      CITY_MISSION_KIND: kind,
      CITY_PROMPT_FILE: resolve(dir, "task.txt"),
      CITY_OUTPUT_FILE: output,
      CITY_EXCHANGE_FILE: resolve(dir, "exchanges.jsonl"),
      CITY_CHECKPOINT_DIR: dir,
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
const timer = setTimeout(
  stop,
  process.env.CITY_CHECKINS === "1" ? 1_200_000 : 240_000,
);
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
      checkedArtifact?: string;
      outputCheck?: ReturnType<typeof checkExpectedOutput>;
    })
  | null = null;
if (code === 0 && kind === "kujo") {
  const exchanges = (await readFile(resolve(dir, "exchanges.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const author = exchanges.findLast(
    (entry) => entry.agent === "coder" && entry.kind === "model.response",
  );
  if (typeof author?.content !== "string")
    throw Error("Kujo author response unavailable");
  const fence = /^\s*```(?:kujo)?\s*\n([\s\S]*?)\n```\s*$/.exec(author.content);
  await writeFile(
    resolve(dir, "draft.kujo"),
    fence ? fence[1] : author.content,
    { mode: 0o600 },
  );
  const checkedArtifact = profiles ? "reviewed.kujo" : "draft.kujo";
  if (profiles)
    await writeFile(
      resolve(dir, checkedArtifact),
      await readFile(output, "utf8"),
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
    { profile: "city-kujo-checker", agent: "kujo-checker", tool: "kujo.check" },
  );
  await observe("kujo-static-check", "evaluation", "started", "unset");
  const syntax = await new Promise<"valid" | "invalid" | "unavailable">(
    (done) => {
      const checker = spawn(
        process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
        ["check", resolve(dir, checkedArtifact), "--quiet"],
        { stdio: "ignore", timeout: 10000 },
      );
      checker.once("error", () => done("unavailable"));
      checker.once("exit", (code, signal) =>
        done(signal ? "unavailable" : code === 0 ? "valid" : "invalid"),
      );
    },
  );
  await observe(
    "kujo-static-check",
    "evaluation",
    "finished",
    syntax === "valid"
      ? "succeeded"
      : syntax === "invalid"
        ? "failed"
        : "unknown",
  );
  validation = {
    schema: "agent-city.code-check.v1",
    syntax,
    fenceRemoved: profiles ? false : Boolean(fence),
    checkedArtifact,
    functionalTests: expectedOutput === null ? "not-run" : "unavailable",
    ...(expectedOutput === null
      ? {}
      : {
          outputCheck: checkExpectedOutput(expectedOutput, {
            status: "unverified",
            codeExecuted: false,
            output: null,
            outputTruncated: false,
          }),
        }),
    codeExecuted: false,
    checkedAt: new Date().toISOString(),
  };
  if (executeWorkcell && syntax === "valid") {
    const executed = await executeMissionWorkcell({
      root,
      directory: dir,
      artifact: resolve(dir, checkedArtifact),
      project: workcellProject,
      producer,
      run: dispatch.run_id,
      spool: resolve(
        root,
        process.env.CITY_RUNTIME_DIR || ".runtime",
        `spool-${producer}.jsonl`,
      ),
    });
    validation.codeExecuted = executed.codeExecuted;
    if (expectedOutput !== null) {
      const outputObserve = checkObserver(
        resolve(
          root,
          process.env.CITY_RUNTIME_DIR || ".runtime",
          `spool-${producer}.jsonl`,
        ),
        producer,
        dispatch.run_id,
        dispatch.run_id + ":produce-artifact",
        {
          profile: "city-kujo-checker",
          agent: "kujo-checker",
          tool: "city.output-check",
        },
      );
      await outputObserve(
        "kujo-output-check",
        "evaluation",
        "started",
        "unset",
      );
      validation.outputCheck = checkExpectedOutput(expectedOutput, executed);
      validation.functionalTests = validation.outputCheck.status;
      await outputObserve(
        "kujo-output-check",
        "evaluation",
        "finished",
        validation.outputCheck.status === "passed"
          ? "succeeded"
          : validation.outputCheck.status === "failed"
            ? "failed"
            : "unknown",
      );
    }
  }
  await writeFile(resolve(dir, "validation.json"), JSON.stringify(validation), {
    mode: 0o600,
  });
}
if (code === 0 && kind === "code") {
  validation = await checkCodeArtifact(output);
  if (requestedContract) {
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
        requestedContract,
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
    } catch (error) {
      await writeFile(
        resolve(dir, "functional.json"),
        JSON.stringify({
          schema: "agent-city.function-check.v1",
          status: "unavailable",
          codeExecuted: null,
          cases: [],
          reason: "Isolated function checker did not return verified results",
          diagnostic: (error instanceof Error
            ? error.message
            : String(error)
          ).slice(0, 4096),
        }),
        { mode: 0o600 },
      );
      validation = {
        ...validation,
        functionalTests: "unavailable",
        codeExecuted: null,
      };
      await observe("function-suite", "evaluation", "finished", "unknown");
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
