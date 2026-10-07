import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";
import { verifyWorkcellEvidence } from "./workcell-evidence";

export function admitWorkcell(
  requested: unknown,
  kind: string,
  env = process.env,
) {
  if (requested === undefined || requested === false) return false;
  if (requested !== true || kind !== "kujo")
    throw Error("Workcell execution requires an explicit Kujo mission opt-in");
  if (env.CITY_ENABLE_WORKCELL !== "1" || !env.CITY_WORKCELL_IMAGE?.trim())
    throw Error(
      "Workcell is not configured: operator must enable it and select a trusted local Kujo image",
    );
  return true;
}

/** Execute only the statically checked artifact in a mission-owned disposable repository. */
export async function executeMissionWorkcell(options: {
  root: string;
  directory: string;
  artifact: string;
  producer: string;
  run: string;
  spool: string;
}) {
  const runtime = resolve(options.directory, "workcell");
  const result = await boundedCommand(
    process.execPath,
    ["--import", "tsx", resolve(options.root, "integrations/kujo/workcell.ts")],
    {
      cwd: options.root,
      timeoutMs: 180_000,
      env: {
        ...process.env,
        CITY_RUNTIME_DIR: runtime,
        CITY_WORKCELL_KUJO_FILE: options.artifact,
        CITY_RUN: options.run,
        CITY_PRODUCER: options.producer,
        CITY_SPOOL: options.spool,
        CITY_TASK: options.run + ":produce-artifact",
      },
    },
  );
  let evidence: Awaited<ReturnType<typeof verifyWorkcellEvidence>> | null =
    null;
  if (result.code === 0 && !result.timedOut && !result.spawnError) {
    try {
      const proof = JSON.parse(
        await readFile(resolve(runtime, "workcell-proof.json"), "utf8"),
      );
      evidence = await verifyWorkcellEvidence(
        resolve(runtime, "workcell-source"),
        proof.summary,
        ["city-result.txt", "runtime-version.txt"],
      );
    } catch {
      /* No artifact or completion inferred from an incomplete receipt. */
    }
  }
  let output: string | null = null;
  let runtimeVersion: string | null = null;
  if (evidence) {
    const artifacts = resolve(
      runtime,
      "workcell-source/.workcell/runs",
      evidence.runId,
      "artifacts",
    );
    output = (
      await readFile(resolve(artifacts, "city-result.txt"), "utf8")
    ).slice(0, 65536);
    runtimeVersion = (
      await readFile(resolve(artifacts, "runtime-version.txt"), "utf8")
    ).slice(0, 200);
  }
  const record = {
    schema: "agent-city.mission-workcell.v1",
    status: evidence ? "completed" : "unverified",
    codeExecuted: evidence ? true : null,
    cleanup: evidence ? "complete" : "unknown",
    timedOut: result.timedOut,
    exitCode: result.code,
    evidence,
    output,
    runtimeVersion,
    outputTruncated: evidence
      ? (evidence.artifacts.find((a) => a.name === "city-result.txt")?.bytes ??
          0) > 65536
      : false,
    checkedAt: new Date().toISOString(),
  };
  await writeFile(
    resolve(options.directory, "workcell.json"),
    JSON.stringify(record, null, 2),
    { mode: 0o600 },
  );
  return record;
}
