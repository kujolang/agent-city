import { validateProjectExports, readProjectOutputs } from "./project-exports";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { verifyWorkcellEvidence } from "./workcell-evidence";

async function json(file: string, limit: number) {
  if ((await stat(file)).size > limit)
    throw Error("Workcell record exceeds limit");
  const text = await readFile(file, "utf8");
  if (Buffer.byteLength(text) > limit)
    throw Error("Workcell record exceeds limit");
  return JSON.parse(text);
}

/** Read-only recovery: no commands, writes, telemetry fabrication or source retries. */
export async function readWorkcellRecord(directory: string) {
  let record;
  try {
    record = await json(resolve(directory, "workcell.json"), 1_048_576);
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (record.schema !== "agent-city.mission-workcell.v1")
    throw Error("Invalid Workcell record");
  if (record.status !== "pending" && record.status !== "unverified")
    return record;
  const unknown = {
    ...record,
    status: "unverified",
    codeExecuted: null,
    cleanup: "unknown",
  };
  if (typeof record.run !== "string" || typeof record.producer !== "string")
    return unknown;
  try {
    const runtime = resolve(directory, "workcell");
    const proof = await json(resolve(runtime, "workcell-proof.json"), 262144);
    if (
      proof.run !== record.run ||
      proof.producer !== record.producer ||
      proof.code !== 0 ||
      proof.timedOut !== false ||
      proof.spawnError ||
      proof.evidenceError
    )
      return unknown;
    const projectExports = validateProjectExports(record.projectExports, true);
    const evidence = await verifyWorkcellEvidence(
      resolve(runtime, "workcell-source"),
      proof.summary,
      [
        "city-result.txt",
        "runtime-version.txt",
        ...projectExports.map((path) => "project/" + path),
      ],
    );
    const artifacts = resolve(
      runtime,
      "workcell-source/.workcell/runs",
      evidence.runId,
      "artifacts",
    );
    let projectOutputs: Awaited<ReturnType<typeof readProjectOutputs>> = [];
    let projectExportError: string | null = null;
    try {
      projectOutputs = await readProjectOutputs(
        directory,
        projectExports,
        evidence,
        record.projectInputs,
      );
    } catch (error) {
      projectExportError =
        error instanceof Error
          ? error.message
          : "Project output contents unavailable";
    }
    return {
      ...record,
      status: "completed",
      codeExecuted: true,
      cleanup: "complete",
      recovered: true,
      recoverySource: "verified-local-receipt",
      evidence,
      projectOutputs,
      projectExportsStatus: !projectExports.length
        ? "not-requested"
        : projectExportError
          ? "unavailable"
          : "complete",
      projectExportError,
      output: (
        await readFile(resolve(artifacts, "city-result.txt"), "utf8")
      ).slice(0, 65536),
      runtimeVersion: (
        await readFile(resolve(artifacts, "runtime-version.txt"), "utf8")
      ).slice(0, 200),
      outputTruncated:
        (evidence.artifacts.find((a) => a.name === "city-result.txt")?.bytes ??
          0) > 65536,
    };
  } catch {
    return unknown;
  }
}
