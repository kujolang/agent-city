/** Select saved bytes, never turn reviewer commentary into executable code. */
export function artifactDownload(
  id: string,
  artifact: {
    kind?: string;
    content?: unknown;
    draft?: unknown;
    validation?: { checkedArtifact?: string };
  },
) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  const reviewed = artifact.validation?.checkedArtifact === "reviewed.kujo";
  const content =
    artifact.kind === "kujo" && !reviewed ? artifact.draft : artifact.content;
  if (typeof content !== "string") return null;
  const extension =
    artifact.kind === "kujo"
      ? "kujo"
      : artifact.kind === "code"
        ? "mjs"
        : artifact.kind === "writing"
          ? "md"
          : null;
  if (!extension) return null;
  const label =
    artifact.kind === "kujo" && !reviewed
      ? "author draft"
      : "reviewed artifact";
  return {
    content,
    filename: `${id}-${label.replaceAll(" ", "-")}.${extension}`,
    label,
    mime: "text/plain;charset=utf-8",
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
