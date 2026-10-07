export function nativeStatus(phase: string, outcome: string) {
  if (phase === "started" || phase === "gap") return "unset";
  return outcome === "succeeded"
    ? "ok"
    : outcome === "failed"
      ? "error"
      : "unset";
}

export function reportedWorkcellFailure(
  result: { code: number | null; timedOut: boolean; spawnError?: string },
  summary: any,
) {
  return (
    Number.isInteger(result.code) &&
    result.code !== 0 &&
    !result.timedOut &&
    !result.spawnError &&
    summary?.schema_version === "workcell-run-summary/v1" &&
    summary.ok === false &&
    /^wc-[a-f0-9]{32}$/.test(summary.run_id || "")
  );
}
