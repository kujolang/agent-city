/** Select saved bytes, never turn reviewer commentary into executable code. */
export function artifactDownload(
  id: string,
  artifact: {
    kind?: string;
    content?: unknown;
    draft?: unknown;
    validation?: { checkedArtifact?: string };
    workflowValidation?: { workflow?: string; status?: string };
  },
) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const reviewed = artifact.validation?.checkedArtifact === "reviewed.kujo";
  const content =
    artifact.kind === "kujo" && !reviewed ? artifact.draft : artifact.content;
  if (typeof content !== "string") return null;
  const webops =
    artifact.kind === "writing" &&
    artifact.workflowValidation?.workflow === "webops-report";
  const extension = webops
    ? "json"
    : artifact.kind === "kujo"
      ? "kujo"
      : artifact.kind === "code"
        ? "mjs"
        : artifact.kind === "writing"
          ? "md"
          : null;
  if (!extension) return null;
  const label = webops
    ? artifact.workflowValidation?.status === "passed"
      ? "checked report"
      : "failed report"
    : artifact.kind === "kujo" && !reviewed
      ? "author draft"
      : "reviewed artifact";
  return {
    content,
    filename: `${id}-${label.replaceAll(" ", "-")}.${extension}`,
    label,
    mime: webops
      ? "application/json;charset=utf-8"
      : "text/plain;charset=utf-8",
  };
}

export function functionalSummary(
  functional:
    | {
        status?: string;
        reason?: string;
        diagnostic?: string;
        cases?: { name: string; status: string; reason: string }[];
      }
    | null
    | undefined,
) {
  if (!functional) return "";
  return (
    "\n\nFUNCTION CHECKS / " +
    (functional.status || "UNKNOWN").toUpperCase() +
    (functional.reason ? "\n" + functional.reason : "") +
    (functional.diagnostic
      ? "\nCHECKER DIAGNOSTIC\n" + functional.diagnostic
      : "") +
    "\n" +
    (functional.cases || [])
      .map((c) => `${c.name}: ${c.status} / ${c.reason}`)
      .join("\n")
  );
}

export function projectBundleDownload(id: string, workcell: any) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(id) ||
    workcell?.status !== "completed" ||
    workcell.codeExecuted !== true ||
    workcell.projectExportsStatus !== "complete" ||
    !/^wc-[a-f0-9]{32}$/.test(workcell.evidence?.runId || "") ||
    !Array.isArray(workcell.projectOutputs) ||
    !workcell.projectOutputs.length
  )
    return null;
  return {
    filename: `${id}-project-files.json`,
    mime: "application/json;charset=utf-8",
    content:
      JSON.stringify(
        {
          schema: "agent-city.project-output-bundle.v1",
          mission: id,
          workcellRef: workcell.evidence.runId,
          scope:
            "Observed exported files; not applied to host project. Correctness and review remain separate.",
          files: workcell.projectOutputs,
        },
        null,
        2,
      ) + "\n",
  };
}
