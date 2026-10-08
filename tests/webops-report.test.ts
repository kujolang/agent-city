import { expect, test } from "vitest";
import {
  validateWebopsInput,
  validateWebopsReport,
  type WebopsInput,
} from "../apps/runner/webops-report";
const input: WebopsInput = {
  schema: "agent-city.webops-evidence.v1",
  site: { id: "example", url: "https://example.com" },
  records: [
    {
      id: "f1",
      source: "supplied-audit",
      observedAt: "2026-10-08T10:00:00Z",
      kind: "finding",
      summary: "Missing description",
    },
    {
      id: "a1",
      source: "supplied-receipt",
      observedAt: "2026-10-08T11:00:00Z",
      kind: "action",
      summary: "Description edited",
    },
  ],
  unavailable: ["analytics"],
};
const report = () => ({
  schema: "agent-city.webops-report.v1",
  siteId: "example",
  evidenceClass: "supplied",
  summary:
    "Supplied audit describes a missing description; later receipt records an edit. Outcome unverified.",
  findings: [
    {
      id: "finding-1",
      statement: "Missing description reported",
      evidenceIds: ["f1"],
      state: "UNKNOWN",
    },
  ],
  recommendations: ["Verify current description"],
  recordedActions: ["a1"],
  measuredOutcomes: [],
  unavailable: ["analytics", "historical comparison"],
});
test("WebOps accepts bounded supplied evidence without granting or executing a fetch", () => {
  const copy = validateWebopsInput(input);
  expect(copy).toEqual(input);
  expect(copy).not.toBe(input);
  expect(validateWebopsReport(JSON.stringify(report()), input)).toMatchObject({
    status: "passed",
    codeExecuted: false,
  });
});
test("WebOps rejects malformed, oversized and credential-bearing evidence", () => {
  for (const value of [
    null,
    {},
    { ...input, records: [] },
    { ...input, records: [...input.records, input.records[0]] },
    {
      ...input,
      site: { id: "example", url: "https://secret:token@example.com" },
    },
    {
      ...input,
      records: [{ ...input.records[0], summary: "x".repeat(17000) }],
    },
    { ...input, fetch: true },
  ])
    expect(() => validateWebopsInput(value)).toThrow();
});
test("WebOps rejects invented references, actions, measurements and historical outcomes", () => {
  const variants = [
    { ...report(), siteId: "another-site" },
    { ...report(), evidenceClass: "verified" },
    {
      ...report(),
      findings: [{ ...report().findings[0], evidenceIds: ["invented"] }],
    },
    { ...report(), findings: [{ ...report().findings[0], state: "FIXED" }] },
    { ...report(), recordedActions: ["f1"] },
    { ...report(), measuredOutcomes: ["a1"] },
    { ...report(), unavailable: ["historical comparison"] },
    { ...report(), unavailable: ["analytics"] },
  ];
  for (const value of variants)
    expect(() => validateWebopsReport(JSON.stringify(value), input)).toThrow();
});
