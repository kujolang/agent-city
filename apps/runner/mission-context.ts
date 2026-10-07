import { readWorkcellRecord } from "./workcell-recovery";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

export interface MissionIdentity {
  id: string;
  kind: "writing" | "code" | "kujo";
  status: string;
}

async function bounded(file: string, max: number, optional = false) {
  try {
    if ((await stat(file)).size > max)
      throw Error("Recorded context exceeds the local continuation limit");
    const text = await readFile(file, "utf8");
    if (Buffer.byteLength(text) > max)
      throw Error("Recorded context exceeds the local continuation limit");
    return text;
  } catch (error: any) {
    if (optional && error.code === "ENOENT") return null;
    throw error;
  }
}

/** Call only after resolving the exact ID in this controller's authorized history. */
export async function missionDetails(
  missionsRoot: string,
  job: MissionIdentity,
) {
  if (!/^mission-[0-9a-f-]{36}$/.test(job.id))
    throw Error("Invalid recorded mission ID");
  const dir = resolve(missionsRoot, job.id);
  const requestText = await bounded(resolve(dir, "request.json"), 50_000, true);
  const request = requestText ? JSON.parse(requestText) : null;
  const prompt =
    request?.prompt ?? (await bounded(resolve(dir, "task.txt"), 16_384));
  const originalTask = request?.originalTask ?? prompt;
  if (
    typeof prompt !== "string" ||
    typeof originalTask !== "string" ||
    Buffer.byteLength(originalTask) > 16_384
  )
    throw Error("Recorded task context is invalid");
  const checks = await bounded(
    resolve(dir, "function-contract.json"),
    16_384,
    true,
  );
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    prompt,
    originalTask,
    rootMissionId: request?.rootMissionId ?? job.id,
    parentMissionId: request?.parentMissionId ?? null,
    functionContract: checks ? JSON.parse(checks) : null,
  };
}

export async function continuationContext(
  missionsRoot: string,
  job: MissionIdentity,
) {
  if (!["completed", "failed"].includes(job.status))
    throw Error("Wait for the source mission to finish before continuing");
  const details = await missionDetails(missionsRoot, job);
  const dir = resolve(missionsRoot, job.id);
  const artifact =
    job.status === "completed"
      ? await bounded(
          resolve(dir, job.kind === "code" ? "reviewed.mjs" : "reviewed.md"),
          65_536,
        )
      : null;
  const checkText = await bounded(
    resolve(dir, "functional.json"),
    32_768,
    true,
  );
  const validationText = await bounded(
    resolve(dir, "validation.json"),
    32_768,
    true,
  );
  // Explicit follow-up sends prior results to its model, but never grants execution.
  const workcell = job.kind === "kujo" ? await readWorkcellRecord(dir) : null;
  const context = {
    schema: "agent-city.continuation.v1",
    parentMissionId: job.id,
    rootMissionId: details.rootMissionId,
    originalTask: details.originalTask,
    previousRequest: details.prompt,
    previousRuntimeStatus: job.status,
    previousArtifact: artifact,
    previousChecks: checkText ? JSON.parse(checkText) : null,
    previousValidation: validationText ? JSON.parse(validationText) : null,
    previousWorkcell: workcell
      ? {
          status: workcell.status,
          codeExecuted: workcell.codeExecuted,
          cleanup: workcell.cleanup,
          exitCode: workcell.exitCode ?? null,
          timedOut: workcell.timedOut ?? null,
          evidence: workcell.evidence ?? null,
          output: workcell.output ?? null,
          runtimeVersion: workcell.runtimeVersion ?? null,
          outputTruncated: workcell.outputTruncated ?? false,
          recovered: workcell.recovered === true,
        }
      : null,
  };
  // Never silently truncate source context or recursively embed earlier bundles.
  if (Buffer.byteLength(JSON.stringify(context)) > 131_072)
    throw Error("Recorded context exceeds the local continuation limit");
  return context;
}
