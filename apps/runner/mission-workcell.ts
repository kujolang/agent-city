import { validateProjectExports, readProjectOutputs } from "./project-exports";
import { projectContext, projectReferences } from "./project-context";
import { readFile, writeFile, rename } from "node:fs/promises";
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
  project?: ReturnType<typeof projectContext>;
  projectExports?: string[];
}) {
  const runtime = resolve(options.directory, "workcell");
  const project = projectContext(options.project?.files);
  const projectExports = validateProjectExports(options.projectExports, true);
  const exportsFile = projectExports.length
    ? resolve(options.directory, "project-exports.json")
    : "";
  if (exportsFile)
    await writeFile(exportsFile, JSON.stringify(projectExports), {
      mode: 0o600,
    });
  const projectFile = project
    ? resolve(options.directory, "workcell-project-inputs.json")
    : "";
  if (project)
    await writeFile(projectFile, JSON.stringify(project), { mode: 0o600 });
  async function save(record: unknown) {
    const file = resolve(options.directory, "workcell.json");
    await writeFile(file + ".tmp", JSON.stringify(record, null, 2), {
      mode: 0o600,
    });
    await rename(file + ".tmp", file);
  }
  await save({
    schema: "agent-city.mission-workcell.v1",
    status: "pending",
    run: options.run,
    producer: options.producer,
    codeExecuted: null,
    cleanup: "unknown",
    startedAt: new Date().toISOString(),
    projectExports,
    projectInputs: projectReferences(project),
  });
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
        CITY_WORKCELL_PROJECT_FILE: projectFile,
        CITY_PROJECT_EXPORTS_FILE: exportsFile,
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
        [
          "city-result.txt",
          "runtime-version.txt",
          ...projectExports.map((path) => "project/" + path),
        ],
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
  let projectOutputs: Awaited<ReturnType<typeof readProjectOutputs>> = [];
  let projectExportError: string | null = null;
  if (evidence) {
    try {
      projectOutputs = await readProjectOutputs(
        options.directory,
        projectExports,
        evidence,
        projectReferences(project),
      );
    } catch (error) {
      projectExportError =
        error instanceof Error
          ? error.message
          : "Project output contents unavailable";
    }
  }
  const record = {
    run: options.run,
    producer: options.producer,
    schema: "agent-city.mission-workcell.v1",
    status: evidence ? "completed" : "unverified",
    codeExecuted: evidence ? true : null,
    cleanup: evidence ? "complete" : "unknown",
    timedOut: result.timedOut,
    exitCode: result.code,
    evidence,
    output,
    runtimeVersion,
    projectInputs: projectReferences(project),
    projectExports,
    projectOutputs,
    projectExportsStatus: !projectExports.length
      ? "not-requested"
      : evidence && !projectExportError
        ? "complete"
        : "unavailable",
    projectExportError,
    outputTruncated: evidence
      ? (evidence.artifacts.find((a) => a.name === "city-result.txt")?.bytes ??
          0) > 65536
      : false,
    checkedAt: new Date().toISOString(),
  };
  await save(record);
  return record;
}
