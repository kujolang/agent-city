/** Bounded WebOps supplied-evidence reporting. No crawler, network or mutation grant. */
export interface WebopsInput {
  schema: "agent-city.webops-evidence.v1";
  site: { id: string; url: string };
  records: {
    id: string;
    source: string;
    observedAt: string;
    kind: "finding" | "action" | "measurement";
    summary: string;
  }[];
  unavailable: string[];
}
const text = (v: unknown, limit: number): v is string =>
  typeof v === "string" && !!v.trim() && v.length <= limit && !v.includes("\0");
const keys = (v: any, allowed: string[]) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => allowed.includes(k));
export function validateWebopsInput(value: unknown): WebopsInput {
  const v = value as WebopsInput;
  if (
    !keys(v, ["schema", "site", "records", "unavailable"]) ||
    v.schema !== "agent-city.webops-evidence.v1" ||
    Buffer.byteLength(JSON.stringify(v)) > 16384 ||
    !keys(v.site, ["id", "url"]) ||
    !text(v.site.id, 80) ||
    !/^[a-zA-Z0-9_.:-]+$/.test(v.site.id) ||
    !text(v.site.url, 2048)
  )
    throw Error("Provide a bounded WebOps site/evidence input");
  let url: URL;
  try {
    url = new URL(v.site.url);
  } catch {
    throw Error("Invalid site URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw Error(
      "Site URL must be HTTP(S) without credentials or fragment; it will not be fetched",
    );
  if (
    !Array.isArray(v.records) ||
    !v.records.length ||
    v.records.length > 32 ||
    !Array.isArray(v.unavailable) ||
    v.unavailable.length > 32 ||
    v.unavailable.some((x) => !text(x, 160))
  )
    throw Error(
      "Supply 1–32 evidence records and explicit unavailable evidence families",
    );
  const ids = new Set<string>();
  for (const r of v.records) {
    if (
      !keys(r, ["id", "source", "observedAt", "kind", "summary"]) ||
      !text(r.id, 80) ||
      !/^[a-zA-Z0-9_.:-]+$/.test(r.id) ||
      ids.has(r.id) ||
      !text(r.source, 256) ||
      !text(r.summary, 2048) ||
      !text(r.observedAt, 40) ||
      !/^\d{4}-\d\d-\d\dT/.test(r.observedAt) ||
      !Number.isFinite(Date.parse(r.observedAt)) ||
      !["finding", "action", "measurement"].includes(r.kind)
    )
      throw Error("Invalid or duplicate timestamped WebOps evidence record");
    ids.add(r.id);
  }
  return JSON.parse(JSON.stringify(v));
}
export function webopsInstructions(input: WebopsInput) {
  validateWebopsInput(input);
  return `Execute the WebOps Reporter supplied-evidence workflow. This is the role's degraded reporting contract: only the validated user-supplied records below are available. No website fetch, crawl, analytics, search, RunLedger query, historical comparison, publishing or mutation ran. Preserve source timestamps and references. Do not recreate unavailable specialist evidence. Capability website means this exact site's supplied evidence only, not live access. Return a JSON report with exactly schema="agent-city.webops-report.v1", siteId, evidenceClass="supplied", summary (string), findings (array of {id,statement,evidenceIds:string[],state:"UNKNOWN"}), recommendations (string array), recordedActions (IDs of supplied action records), measuredOutcomes (IDs of supplied measurement records), unavailable (copy the input list, plus "historical comparison" if absent). All findings need real input evidence IDs; recommendations are proposals, never performed actions. State UNKNOWN because no verified prior comparison exists. Do not claim validation has already passed. Supplied evidence:\n${JSON.stringify(input)}`;
}
export function validateWebopsReport(content: string, input: WebopsInput) {
  validateWebopsInput(input);
  if (Buffer.byteLength(content) > 131072)
    throw Error("WebOps report exceeds limit");
  const v = JSON.parse(content);
  if (
    !keys(v, [
      "schema",
      "siteId",
      "evidenceClass",
      "summary",
      "findings",
      "recommendations",
      "recordedActions",
      "measuredOutcomes",
      "unavailable",
    ]) ||
    v.schema !== "agent-city.webops-report.v1" ||
    v.siteId !== input.site.id ||
    v.evidenceClass !== "supplied" ||
    !text(v.summary, 8192)
  )
    throw Error("WebOps report identity/provenance is invalid");
  if (
    !Array.isArray(v.findings) ||
    v.findings.length > 32 ||
    !Array.isArray(v.recommendations) ||
    v.recommendations.length > 32 ||
    v.recommendations.some((x: unknown) => !text(x, 2048))
  )
    throw Error("Invalid report findings/recommendations");
  const ids = new Set(input.records.map((r) => r.id)),
    findings = new Set();
  for (const f of v.findings) {
    if (
      !keys(f, ["id", "statement", "evidenceIds", "state"]) ||
      !text(f.id, 80) ||
      findings.has(f.id) ||
      !text(f.statement, 4096) ||
      f.state !== "UNKNOWN" ||
      !Array.isArray(f.evidenceIds) ||
      !f.evidenceIds.length ||
      f.evidenceIds.length > 32 ||
      f.evidenceIds.some(
        (id: unknown) => typeof id !== "string" || !ids.has(id),
      )
    )
      throw Error(
        "Findings must reference supplied evidence without inferred historical states",
      );
    findings.add(f.id);
  }
  for (const [field, kind] of [
    ["recordedActions", "action"],
    ["measuredOutcomes", "measurement"],
  ])
    if (
      !Array.isArray(v[field]) ||
      v[field].length > 32 ||
      v[field].some(
        (id: unknown) =>
          !input.records.some((r) => r.id === id && r.kind === kind),
      )
    )
      throw Error("Report claims an unsupported action or measurement");
  if (
    !Array.isArray(v.unavailable) ||
    v.unavailable.length > 40 ||
    v.unavailable.some((x: unknown) => !text(x, 160)) ||
    ![...input.unavailable, "historical comparison"].every((x) =>
      v.unavailable.includes(x),
    )
  )
    throw Error("Unavailable evidence must remain explicit");
  return {
    schema: "agent-city.workflow-check.v1",
    workflow: "webops-report",
    status: "passed",
    scope:
      "Report structure, site identity and references to supplied evidence; not independent factual verification",
    codeExecuted: false,
  };
}
