import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { projectContext, projectReferences } from "./project-context";

/** Snapshot execution is a new per-task grant, never inherited from context. */
export function admitWorkcellProject(
  requested: unknown,
  executeWorkcell: boolean,
  snapshot: unknown,
) {
  if (requested === undefined || requested === false) return null;
  if (requested !== true || !executeWorkcell)
    throw Error(
      "Copying project inputs requires explicit Workcell execution and project-input consent",
    );
  const project = projectContext(snapshot);
  if (!project)
    throw Error("Select project files before enabling project-input execution");
  const names: string[] = project.files.map((f) => f.path.toLowerCase());
  for (const name of names) {
    if (
      name
        .split("/")
        .some((part) =>
          [
            ".git",
            ".gitignore",
            ".gitattributes",
            ".gitmodules",
            ".workcell",
          ].includes(part),
        ) ||
      names.some((other) => other !== name && other.startsWith(name + "/"))
    )
      throw Error(
        "Project inputs cannot contain repository internals or conflicting file/directory names",
      );
  }
  return project;
}

/** Only a new owned directory is accepted: no existing symlink/tree is followed. */
export async function stageWorkcellProject(source: string, snapshot: unknown) {
  const project = admitWorkcellProject(true, true, snapshot)!;
  const directory = resolve(source, "project");
  await mkdir(directory, { mode: 0o700 });
  for (const file of project.files) {
    const target = resolve(directory, file.path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, file.content, { mode: 0o600, flag: "wx" });
  }
  return projectReferences(project);
}
