import { validWorkcellArtifactName } from "./project-exports";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";

/** A CLI exit is not artifact evidence. Resolve only this invocation's local receipt. */
export async function verifyWorkcellEvidence(
  source: string,
  summary: unknown,
  expectedArtifacts: readonly string[],
  limits: Record<string, number> = {},
) {
  for (const [name, limit] of Object.entries(limits))
    if (
      !expectedArtifacts.includes(name) ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 33554432
    )
      throw Error("Invalid explicit Workcell artifact limit");
  const data = summary as Record<string, unknown> | null;
  if (
    data?.schema_version !== "workcell-run-summary/v1" ||
    data.ok !== true ||
    typeof data.run_id !== "string" ||
    !/^wc-[a-f0-9]{32}$/.test(data.run_id)
  )
    throw Error("Missing or unsuccessful Workcell summary");
  const directory = resolve(source, ".workcell/runs", data.run_id);
  const base = await realpath(directory);
  if (base !== directory)
    throw Error("Workcell evidence directory is redirected");
  async function localFile(path: string, limit: number) {
    const file = resolve(directory, path);
    const info = await lstat(file);
    if (
      !info.isFile() ||
      info.size > limit ||
      !file.startsWith(base + sep) ||
      (await realpath(file)) !== file
    )
      throw Error("Invalid Workcell evidence file");
    const bytes = await readFile(file);
    if (bytes.length > limit) throw Error("Oversized Workcell evidence file");
    return bytes;
  }
  const receipt = JSON.parse(
    (await localFile("receipt.json", 1_048_576)).toString("utf8"),
  );
  if (
    receipt.schema_version !== "workcell-receipt/v1" ||
    receipt.run_id !== data.run_id ||
    receipt.final_status !== "completed" ||
    receipt.exit_code !== 0 ||
    receipt.timeout !== false ||
    receipt.cancelled !== false ||
    receipt.cleanup_status !== "complete" ||
    receipt.verification?.execution_succeeded !== true ||
    receipt.verification?.artifacts_exported !== true ||
    receipt.verification?.verification_succeeded !== true ||
    receipt.verification?.cleanup_succeeded !== true ||
    !Array.isArray(receipt.exported_artifacts)
  )
    throw Error("Workcell receipt does not prove completed, verified work");
  const artifacts = [];
  for (const name of expectedArtifacts) {
    if (
      !validWorkcellArtifactName(name) ||
      !receipt.exported_artifacts.includes(name)
    )
      throw Error("Expected Workcell artifact was not exported");
    const bytes = await localFile(
      "artifacts/" + name,
      limits[name] ?? (name.startsWith("project/") ? 16384 : 4_000_000),
    );
    artifacts.push({
      name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return { runId: data.run_id, artifacts };
}
