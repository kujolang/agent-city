import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { projectContext } from "./project-context";
import { admitWorkcellProject } from "./workcell-project";

export function validateProjectExports(
  value: unknown,
  executeWorkcell: boolean,
): string[] {
  if (value === undefined || (Array.isArray(value) && !value.length)) return [];
  if (
    !executeWorkcell ||
    !Array.isArray(value) ||
    value.some((path) => typeof path !== "string")
  )
    throw Error(
      "Project file exports require explicit Workcell execution and a list of relative file names",
    );
  return admitWorkcellProject(
    true,
    true,
    value.map((path) => ({ path, content: "" })),
  )!.files.map((f) => f.path);
}

export function validWorkcellArtifactName(name: string) {
  if (
    ["output/draft.mp4", "output/metadata.json", "output/check.json"].includes(
      name,
    )
  )
    return true;
  if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(name)) return true;
  if (!name.startsWith("project/")) return false;
  try {
    return validateProjectExports([name.slice(8)], true).length === 1;
  } catch {
    return false;
  }
}

/** Verify returned bytes against the same completed receipt evidence; never apply them. */
export async function readProjectOutputs(
  directory: string,
  paths: string[],
  evidence: {
    runId: string;
    artifacts: { name: string; bytes: number; sha256: string }[];
  },
  inputs: { path: string; sha256: string }[] = [],
) {
  const names = validateProjectExports(paths, true);
  const files = [];
  for (const path of names) {
    const ref = evidence.artifacts.find((a) => a.name === "project/" + path);
    if (!ref || ref.bytes > 16384)
      throw Error("Project export is missing or exceeds 16 KiB");
    const bytes = await readFile(
      resolve(
        directory,
        "workcell/workcell-source/.workcell/runs",
        evidence.runId,
        "artifacts/project",
        path,
      ),
    );
    if (!Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes))
      throw Error("Project exports must be UTF-8 text");
    files.push({ path, content: bytes.toString("utf8") });
  }
  const result = projectContext(files);
  return (result?.files ?? []).map((file) => {
    const ref = evidence.artifacts.find(
      (a) => a.name === "project/" + file.path,
    )!;
    if (file.bytes !== ref.bytes || file.sha256 !== ref.sha256)
      throw Error("Project export no longer matches verified evidence");
    const previous = inputs.find((input) => input.path === file.path);
    return {
      ...file,
      beforeSha256: previous?.sha256 ?? null,
      change: previous
        ? previous.sha256 === file.sha256
          ? "unchanged"
          : "modified"
        : "created",
    };
  });
}
