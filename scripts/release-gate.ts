import { readFile, writeFile } from "node:fs/promises";
import { assessRelease } from "./release-assessment.ts";
const paths = {
  stress: "evidence/blockers/stress.json",
  browser: "evidence/portrait-app/browser.json",
  renderer: "evidence/portrait-app/context-check/browser.json",
  zoom: "evidence/browser-zoom/proof.json",
  visibility: "evidence/browser-visibility/proof.json",
  recovery: "evidence/hardening/recovery.json",
  pipeline: "evidence/clean-throughput/throughput-ubuntu-24.04.json",
  reconnect: "evidence/reconnect-load/37711890418/x64.json",
  continuity: "evidence/blockers/watchdog-continuity.log",
};
const input: Record<string, any> = {};
const evidenceErrors: Record<string, string> = {};
for (const [key, path] of Object.entries(paths)) {
  try {
    const raw = await readFile(path, "utf8");
    const value = key === "continuity" ? raw : JSON.parse(raw);
    if (
      key !== "continuity" &&
      (!value || typeof value !== "object" || Array.isArray(value))
    )
      throw new Error("Expected an evidence object");
    input[key] = value;
  } catch (error) {
    evidenceErrors[key] =
      error instanceof Error ? error.message : String(error);
  }
}
const result = {
  ...assessRelease(input),
  evidencePaths: paths,
  evidenceErrors,
};
await writeFile(
  "evidence/blockers/release-gates.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
// Both failures and missing qualification must remain non-green for automation.
process.exitCode = result.status === "PASS" ? 0 : 1;
