import { validateProjectExports } from "./project-exports";
import { admitWorkcellProject } from "./workcell-project";
import { projectContext } from "./project-context";
import { validateExpectedOutput } from "./output-check";
import {
  admissionHeld,
  releaseAdmission,
  type AdmissionRelease,
} from "./mission-admission";
import { readMissionOutcome } from "./mission-recovery";
import { readWorkcellRecord } from "./workcell-recovery";
import { admitWorkcell } from "./mission-workcell";
import { assertWorkcellAvailable } from "./workcell-preflight";
import { providerDiagnostics } from "./provider-diagnostics";
import {
  selectProfiles,
  readBinding,
  bindingMetadata,
  validateProfileMission,
} from "./profile-binding";
import { catalogSummary } from "./agent-catalog";
import { discoverOllama, checkModelConnection } from "./provider-discovery";
import { readCheckpoint, answerCheckpoint } from "./checkpoint";
import { validateModelConfig, type ModelConfig } from "./config";
import { validateFunctionContract } from "./function-check";
import { missionDetails, continuationContext } from "./mission-context";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

// Local business entry point, deliberately separate from the read-only projection.
const root = resolve(import.meta.dirname, "../..");
const dir = resolve(
  process.env.CITY_CONTROL_DIR || resolve(root, ".runtime/control"),
);
await mkdir(dir, { recursive: true, mode: 0o700 });
const missionsRoot = resolve(
  process.env.CITY_MISSIONS_DIR || resolve(root, ".runtime/missions"),
);
const token = randomBytes(32).toString("hex");
const origin = process.env.CITY_WEB_ORIGIN || "http://127.0.0.1:5178";
const port = Number(process.env.CITY_CONTROL_PORT || 7793);
type Job = {
  id: string;
  kind: "writing" | "code" | "kujo";
  status: "running" | "completed" | "failed" | "unknown";
  startedAt: string;
  profiles?: ReturnType<typeof bindingMetadata>;
  useLocalDocs?: boolean;
  useMcpDocs?: boolean;
  executeWorkcell?: boolean;
  finishedAt?: string;
  admissionRelease?: AdmissionRelease;
  parentMissionId?: string;
  rootMissionId?: string;
  processOutcome?: {
    kind: "spawn-error" | "exit";
    code: string | number | null;
    signal?: string | null;
  };
};
let jobs: Job[] = [];
try {
  jobs = JSON.parse(await readFile(resolve(dir, "jobs.json"), "utf8"));
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
for (const job of jobs) if (job.status === "running") job.status = "unknown";
let storageHealthy = true;
let persistence = Promise.resolve();
function save() {
  const snapshot = JSON.stringify(jobs);
  persistence = persistence
    .then(async () => {
      await writeFile(resolve(dir, "jobs.tmp"), snapshot, { mode: 0o600 });
      await rename(resolve(dir, "jobs.tmp"), resolve(dir, "jobs.json"));
    })
    .catch((error) => {
      storageHealthy = false;
      throw error;
    });
  return persistence;
}
async function readJobOutcome(job: Job) {
  return (
    (await readMissionOutcome(
      resolve(missionsRoot, job.id, "receipt.json"),
      job,
    )) ??
    (await readMissionOutcome(
      resolve(missionsRoot, job.id, "process-receipt.json"),
      {
        ...job,
        schema: "agent-city.mission-process.v1",
        scope: "mission-process-only",
      },
    ))
  );
}
async function reconcile() {
  let changed = false;
  for (const job of jobs.filter((j) => j.status === "unknown")) {
    const outcome = await readJobOutcome(job);
    if (!outcome) continue;
    job.status = outcome.status;
    job.finishedAt = outcome.finishedAt;
    changed = true;
  }
  if (changed) await save();
}
await save();
let active: ChildProcess | null = null;
let submitting = false;
let config: ModelConfig | null = null;
try {
  config = validateModelConfig(
    JSON.parse(await readFile(resolve(dir, "model.json"), "utf8")),
  );
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
if (!config && process.env.CITY_MODEL_ENDPOINT && process.env.CITY_MODEL)
  config = validateModelConfig({
    endpoint: process.env.CITY_MODEL_ENDPOINT,
    model: process.env.CITY_MODEL,
    apiKey: process.env.CITY_MODEL_API_KEY || "",
    maxOutputTokens: Number(process.env.CITY_MAX_OUTPUT_TOKENS || 2048),
    requestTimeoutSeconds: Number(process.env.CITY_MODEL_TIMEOUT_SECONDS || 90),
  });
const configured = () => Boolean(config);
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (
    ![new URL(origin).host, `127.0.0.1:${port}`, `localhost:${port}`].includes(
      req.headers.host || "",
    ) ||
    (req.headers.origin && req.headers.origin !== origin)
  )
    return send(403, { error: "Local origin required" });
  try {
    if (req.method === "GET" && req.url === "/control/agents") {
      try {
        return send(
          200,
          await catalogSummary(resolve(dir, "agent-catalog.json")),
        );
      } catch {
        return send(503, {
          error: "Imported agent catalog is invalid or unavailable",
        });
      }
    }
    if (req.method === "GET" && req.url === "/control/status") {
      await reconcile();
      return send(200, {
        configured: configured(),
        model: config?.model || null,
        endpoint: config?.endpoint || "",
        hasCredential: Boolean(config?.apiKey),
        maxOutputTokens: config?.maxOutputTokens ?? 2048,
        requestTimeoutSeconds: config?.requestTimeoutSeconds ?? 90,
        token,
        storageHealthy,
        canReleaseUnknown: !active && !submitting,
        busy: Boolean(active) || submitting || jobs.some(admissionHeld),
        jobs: jobs.map((job) => ({
          ...job,
          admissionReleased: job.status === "unknown" && !admissionHeld(job),
        })),
      });
    }
    if (req.method === "GET" && req.url?.startsWith("/control/mission/")) {
      const id = req.url.slice("/control/mission/".length);
      const job = jobs.find((j) => j.id === id);
      if (!job) return send(404, { error: "Mission not found" });
      if (!["completed", "failed"].includes(job.status))
        return send(409, { error: "Source mission has not finished" });
      try {
        return send(200, await missionDetails(missionsRoot, job));
      } catch {
        return send(409, {
          error: "Recorded task context is unavailable or exceeds local limits",
        });
      }
    }
    if (req.method === "GET" && req.url?.startsWith("/control/diagnostics/")) {
      const id = req.url.slice("/control/diagnostics/".length);
      if (!jobs.some((job) => job.id === id))
        return send(404, { error: "Mission not found" });
      try {
        return send(200, await providerDiagnostics(missionsRoot, id));
      } catch {
        return send(503, { error: "Provider diagnostics unavailable" });
      }
    }
    if (req.method === "GET" && req.url?.startsWith("/control/exchanges/")) {
      const id = req.url.slice("/control/exchanges/".length);
      if (!jobs.some((j) => j.id === id))
        return send(404, { error: "Mission not found" });
      const file = resolve(missionsRoot, id, "exchanges.jsonl");
      let rows: unknown[] = [],
        complete = false;
      try {
        if ((await stat(file)).size > 2_097_152)
          return send(413, {
            error: "Exchange history exceeds local view limit",
          });
        const body = await readFile(file, "utf8");
        const lines = body.split("\n");
        lines.pop(); // Only complete appended records.
        rows = lines.filter(Boolean).map((line) => JSON.parse(line));
        complete = body === "" || body.endsWith("\n");
        try {
          await stat(file + ".gap");
          complete = false;
        } catch (e: any) {
          if (e.code !== "ENOENT") throw e;
        }
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }
      return send(200, {
        id,
        records: rows,
        profiles: jobs.find((j) => j.id === id)?.profiles ?? null,
        recordingComplete: complete,
        checkpoint:
          jobs.find((j) => j.id === id)?.status === "running"
            ? await readCheckpoint(resolve(missionsRoot, id))
            : null,
      });
    }
    if (req.method === "GET" && req.url?.startsWith("/control/workcell/")) {
      const id = req.url.slice("/control/workcell/".length);
      if (!jobs.some((job) => job.id === id))
        return send(404, { error: "Mission not found" });
      return send(200, {
        id,
        workcell: await readWorkcellRecord(resolve(missionsRoot, id)),
      });
    }
    if (req.method === "GET" && req.url?.startsWith("/control/artifact/")) {
      const id = req.url.slice("/control/artifact/".length);
      const job = jobs.find((j) => j.id === id && j.status === "completed");
      if (!job) return send(404, { error: "Completed mission not found" });
      const file = resolve(
        missionsRoot,
        job.id,
        job.kind === "code" ? "reviewed.mjs" : "reviewed.md",
      );
      let validation = null;
      let functional = null;
      try {
        validation = JSON.parse(
          await readFile(
            resolve(missionsRoot, job.id, "validation.json"),
            "utf8",
          ),
        );
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
      }
      try {
        functional = JSON.parse(
          await readFile(
            resolve(missionsRoot, job.id, "functional.json"),
            "utf8",
          ),
        );
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
      }
      const workcell = await readWorkcellRecord(resolve(missionsRoot, job.id));
      return send(200, {
        id,
        draft:
          job.kind === "kujo"
            ? await readFile(
                resolve(missionsRoot, job.id, "draft.kujo"),
                "utf8",
              )
            : undefined,
        kind: job.kind,
        content: await readFile(file, "utf8"),
        validation,
        functional,
        workcell,
        codeExecuted:
          workcell?.recovered === true
            ? true
            : typeof validation?.codeExecuted === "boolean"
              ? validation.codeExecuted
              : null,
      });
    }
    if (
      req.method !== "POST" ||
      ![
        "/control/missions",
        "/control/config",
        "/control/reply",
        "/control/release-admission",
        "/control/discover-ollama",
        "/control/check-model",
        "/control/check-workcell",
      ].includes(req.url || "")
    )
      return send(404, { error: "Not found" });
    if (
      req.headers.origin !== origin ||
      req.headers["x-city-command-token"] !== token ||
      !req.headers["content-type"]?.startsWith("application/json")
    )
      return send(403, { error: "Explicit local command token required" });
    if (!storageHealthy)
      return send(503, {
        error: "Mission history storage is unavailable; commands stopped",
      });
    await reconcile();
    if (req.url === "/control/release-admission") {
      if (active || submitting)
        return send(409, { error: "A supervised mission is still active" });
      let body = "";
      for await (const bytes of req) {
        body += bytes;
        if (Buffer.byteLength(body) > 4096)
          return send(413, { error: "Recovery request too large" });
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return send(400, { error: "Invalid recovery request" });
      }
      const job = jobs.find(
        (j) => j.id === data?.missionId && j.status === "unknown",
      );
      if (!job)
        return send(409, { error: "No unknown mission with this identity" });
      let decision;
      try {
        decision = releaseAdmission(
          job,
          data.acknowledgedPossibleOngoingWork,
          new Date().toISOString(),
        );
      } catch {
        return send(400, {
          error:
            "Acknowledge that the outcome remains unknown and work may still be running",
        });
      }
      if (admissionHeld(job)) {
        job.admissionRelease = decision;
        await save();
      }
      return send(200, {
        missionId: job.id,
        status: job.status,
        admissionRelease: job.admissionRelease,
      });
    }
    if (req.url === "/control/reply") {
      let body = "";
      for await (const bytes of req) {
        body += bytes;
        if (Buffer.byteLength(body) > 12_000)
          return send(413, { error: "Reply too large" });
      }
      try {
        const data = JSON.parse(body);
        const job = jobs.find(
          (j) => j.id === data.missionId && j.status === "running",
        );
        if (!job)
          return send(409, { error: "No running mission with this identity" });
        await answerCheckpoint(
          resolve(missionsRoot, job.id),
          data.checkpointId,
          data.answer,
        );
        return send(200, { accepted: true });
      } catch {
        return send(409, {
          error:
            "Reply invalid, already submitted, expired, or mission no longer waiting",
        });
      }
    }
    if (active || submitting || jobs.some(admissionHeld))
      return send(409, {
        error: "A mission is running or awaiting source recovery",
      });
    submitting = true;
    let body = "";
    try {
      for await (const bytes of req) {
        body += bytes;
        if (Buffer.byteLength(body) > 131_072)
          return send(413, { error: "Task too large" });
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return send(400, { error: "Invalid JSON" });
      }
      if (req.url === "/control/discover-ollama")
        return send(200, await discoverOllama());
      if (req.url === "/control/check-workcell") {
        try {
          admitWorkcell(true, "kujo");
          await assertWorkcellAvailable(root);
          return send(200, {
            available: true,
            message:
              "Local Workcell engine and image were available at this check. No code was executed. Each Kujo mission still requires your execution opt-in; runtime and sandbox checks happen during execution.",
          });
        } catch (error) {
          return send(200, {
            available: false,
            message:
              error instanceof Error
                ? error.message
                : "Workcell setup unavailable",
          });
        }
      }
      if (req.url === "/control/config" || req.url === "/control/check-model") {
        let next;
        try {
          next = validateModelConfig({
            ...data,
            apiKey:
              data?.apiKey ||
              (data?.endpoint === config?.endpoint ? config?.apiKey || "" : ""),
          });
        } catch {
          return send(400, {
            error:
              "Provide a valid model endpoint and model. Use HTTPS or local HTTP; no credentials in the URL. Output token limit must be 256–16384 and provider timeout 10–300 seconds.",
          });
        }
        if (req.url === "/control/check-model") {
          try {
            return send(200, await checkModelConnection(next));
          } catch {
            return send(502, {
              error:
                "Model listing failed. Check that the provider is running, the endpoint/model are correct, and any required API key is valid. Redirects are refused. Some providers do not support model listing; configuration can still be saved.",
            });
          }
        }
        await writeFile(resolve(dir, "model.tmp"), JSON.stringify(next), {
          mode: 0o600,
        });
        await rename(resolve(dir, "model.tmp"), resolve(dir, "model.json"));
        config = next;
        return send(200, { configured: true });
      }
      if (!configured())
        return send(503, {
          error: "Configure a model before submitting a mission",
        });
      if (
        !data ||
        typeof data !== "object" ||
        !["writing", "code", "kujo"].includes(data.kind) ||
        (data.useLocalDocs !== undefined &&
          typeof data.useLocalDocs !== "boolean") ||
        (data.useMcpDocs !== undefined &&
          typeof data.useMcpDocs !== "boolean") ||
        typeof data.prompt !== "string" ||
        !data.prompt.trim() ||
        Buffer.byteLength(data.prompt) > 16_384
      )
        return send(400, {
          error: "Choose writing/code and provide a task up to 16 KiB",
        });
      let project;
      try {
        project = projectContext(data.projectFiles);
      } catch (error) {
        return send(400, {
          error:
            error instanceof Error ? error.message : "Invalid project files",
        });
      }
      let executeWorkcell = false;
      let expectedOutput: string | null = null;
      let projectExports: string[] = [];
      try {
        executeWorkcell = admitWorkcell(data.executeWorkcell, data.kind);
        projectExports = validateProjectExports(
          data.exportProjectFiles,
          executeWorkcell,
        );
        expectedOutput = validateExpectedOutput(
          data.expectedOutput,
          data.kind,
          executeWorkcell,
        );
        if (executeWorkcell) await assertWorkcellAvailable(root);
      } catch (error) {
        return send(400, {
          error:
            error instanceof Error
              ? error.message
              : "Workcell permission unavailable",
        });
      }
      const id = "mission-" + randomUUID();
      let contextFile = "";
      let context: Awaited<ReturnType<typeof continuationContext>> | null =
        null;
      if (data.parentMissionId !== undefined) {
        const parent = jobs.find((j) => j.id === data.parentMissionId);
        if (!parent)
          return send(404, {
            error: "Prior mission is not in this local history",
          });
        if (parent.kind !== data.kind)
          return send(400, {
            error: "A continuation must keep the prior mission type",
          });
        try {
          context = await continuationContext(missionsRoot, parent);
        } catch {
          return send(409, {
            error:
              "Prior mission context is unavailable, unfinished or too large; no continuation started",
          });
        }
        contextFile = resolve(dir, id + ".context.json");
      }
      let workcellProject = null;
      try {
        workcellProject = admitWorkcellProject(
          data.includeProjectFiles,
          executeWorkcell,
          project?.files ?? context?.previousProject?.files,
        );
      } catch (error) {
        return send(400, {
          error:
            error instanceof Error
              ? error.message
              : "Invalid Workcell project inputs",
        });
      }
      let profileFile = "";
      let binding: Awaited<ReturnType<typeof selectProfiles>> | null = null;
      const priorJob = data.parentMissionId
        ? jobs.find((j) => j.id === data.parentMissionId)
        : undefined;
      try {
        if (priorJob?.profiles) {
          binding = await readBinding(
            resolve(missionsRoot, priorJob.id, "profiles.json"),
          );
          if (
            data.profiles &&
            (data.profiles.authorId !== binding.author.id ||
              data.profiles.reviewerId !== binding.reviewer.id)
          )
            return send(400, {
              error:
                "A continuation retains its original profile contracts. Start a new mission to change profiles.",
            });
        } else if (data.profiles) {
          binding = await selectProfiles(
            resolve(dir, "agent-catalog.json"),
            data.profiles,
          );
        }
      } catch (error) {
        return send(400, {
          error:
            error instanceof Error
              ? error.message
              : "Profile binding unavailable",
        });
      }
      if (binding) {
        try {
          validateProfileMission(binding, data);
        } catch (error) {
          return send(400, {
            error:
              error instanceof Error
                ? error.message
                : "Profile capability unavailable",
          });
        }
        profileFile = resolve(dir, id + ".profiles.json");
        await writeFile(profileFile, JSON.stringify(binding), { mode: 0o600 });
      }
      let contractFile = "";
      if (data.functionContract !== undefined) {
        if (data.kind !== "code")
          return send(400, { error: "Function checks require a code mission" });
        let contract;
        try {
          contract = validateFunctionContract(data.functionContract);
        } catch {
          return send(400, { error: "Invalid function check contract" });
        }
        contractFile = resolve(dir, id + ".checks.json");
        await writeFile(contractFile, JSON.stringify(contract), {
          mode: 0o600,
        });
      }
      const projectExportsFile = projectExports.length
        ? resolve(dir, id + ".exports.json")
        : "";
      if (projectExportsFile)
        await writeFile(projectExportsFile, JSON.stringify(projectExports), {
          mode: 0o600,
        });
      const outputContractFile =
        expectedOutput === null ? "" : resolve(dir, id + ".output.json");
      if (outputContractFile)
        await writeFile(outputContractFile, JSON.stringify(expectedOutput), {
          mode: 0o600,
        });
      const projectFile = project ? resolve(dir, id + ".project.json") : "";
      if (project)
        await writeFile(projectFile, JSON.stringify(project), { mode: 0o600 });
      const prompt = resolve(dir, id + ".txt");
      if (context)
        await writeFile(contextFile, JSON.stringify(context), { mode: 0o600 });
      await writeFile(prompt, data.prompt, { mode: 0o600 });
      const job: Job = {
        id,
        kind: data.kind,
        ...(binding ? { profiles: bindingMetadata(binding) } : {}),
        executeWorkcell,
        useLocalDocs: data.useLocalDocs === true,
        useMcpDocs: data.kind === "kujo" || data.useMcpDocs === true,
        status: "running",
        startedAt: new Date().toISOString(),
        ...(context
          ? {
              parentMissionId: context.parentMissionId,
              rootMissionId: context.rootMissionId,
            }
          : {}),
      };
      jobs = [job, ...jobs].slice(0, 100);
      await save();
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/mission-supervisor.ts", data.kind, prompt],
        {
          cwd: root,
          env: {
            ...process.env,
            CITY_MISSION_ID: id,
            CITY_EXECUTE_WORKCELL: executeWorkcell ? "1" : "0",
            CITY_WORKCELL_PROJECT_INPUTS: workcellProject ? "1" : "0",
            CITY_CHECKINS: data.allowCheckins === true ? "1" : "0",
            CITY_FUNCTION_CONTRACT_FILE: contractFile,
            CITY_OUTPUT_CONTRACT_FILE: outputContractFile,
            CITY_PROJECT_EXPORTS_FILE: projectExportsFile,
            CITY_CONTEXT_FILE: contextFile,
            CITY_PROJECT_CONTEXT_FILE: projectFile,
            CITY_PROFILE_FILE: profileFile,
            CITY_USE_RAG: data.useLocalDocs === true ? "1" : "0",
            CITY_USE_MCP:
              data.kind === "kujo" || data.useMcpDocs === true ? "1" : "0",
            CITY_MODEL_ENDPOINT: config!.endpoint,
            CITY_MODEL: config!.model,
            CITY_MODEL_API_KEY: config!.apiKey,
            CITY_MAX_OUTPUT_TOKENS: String(config!.maxOutputTokens ?? 2048),
            CITY_MODEL_TIMEOUT_SECONDS: String(
              config!.requestTimeoutSeconds ?? 90,
            ),
          },
          stdio: "ignore",
        },
      );
      active = child;
      let finalized = false;
      const finish = async (spawnFailed = false) => {
        if (finalized) return;
        finalized = true;
        // A supervisor exit is not proof that its descendant finished or failed.
        // Fail closed even if the evidence read itself fails.
        job.status = "unknown";
        delete job.finishedAt;
        const outcome = await readJobOutcome(job);
        job.status = outcome?.status ?? (spawnFailed ? "failed" : "unknown");
        if (outcome) job.finishedAt = outcome.finishedAt;
        else if (spawnFailed) job.finishedAt = new Date().toISOString();
        else delete job.finishedAt;
        await save();
        active = null;
      };
      child.once("error", (error: NodeJS.ErrnoException) => {
        // Persist only bounded OS metadata, never command arguments or error text.
        job.processOutcome = {
          kind: "spawn-error",
          code: /^[A-Z0-9_]{1,32}$/.test(error.code || "") ? error.code! : null,
        };
        void finish(true).catch(() => {
          active = null;
        });
      });
      child.once("exit", (code, signal) => {
        if (!finalized) job.processOutcome = { kind: "exit", code, signal };
        void finish().catch(() => {
          active = null;
        });
      });
      return send(202, { id, status: job.status });
    } finally {
      submitting = false;
    }
  } catch {
    if (!res.headersSent)
      send(500, {
        error: "Local mission service could not complete the request",
      });
  }
});
server.requestTimeout = 10_000;
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Local mission service: ${port}; model ${configured() ? "configured" : "not configured"}`,
  ),
);
function stop() {
  active?.kill("SIGTERM");
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
