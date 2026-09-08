import { readFile, writeFile } from "node:fs/promises";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const stress = await read("evidence/blockers/stress.json"),
  browser = await read("evidence/hardening/browser.json"),
  recovery = await read("evidence/hardening/recovery.json"),
  pipeline = await read("evidence/blockers/pipeline.json");
let soak: any = { status: "NOT_RUN" };
try {
  soak = await read(".runtime/soak-latest.json");
} catch {}
const continuity = await readFile(
  "evidence/blockers/watchdog-continuity.log",
  "utf8",
);
const gates = {
  journalThroughput:
    stress.eventsPerSecond >= 1000 &&
    stress.dropped === 0 &&
    stress.accepted >= 60000,
  endToEndStress:
    pipeline.visibleEventsPerSecond >= 1000 &&
    pipeline.missing === 0 &&
    pipeline.duplicates === 0 &&
    pipeline.accepted >= 60000,
  eightHourSoak:
    soak.status === "COMPLETED" &&
    soak.totalSeconds >= 28800 &&
    soak.accepted >= 144000 &&
    soak.missing === 0 &&
    soak.browserCaughtUp === true &&
    !soak.sampleError &&
    soak.maxSampleGapMs < 120000,
  browser: browser.errors.length === 0 && browser.cases.length === 3,
  sourceIndependence: recovery.realOperation?.exitCode === 0,
  watchdogStoreEpoch: continuity.trim() === "telemetry_v2_api_suite: PASS",
};
const result = {
  status: Object.values(gates).every(Boolean) ? "PASS" : "FAIL",
  gates,
  soakStatus: soak.status,
};
await writeFile(
  "evidence/blockers/release-gates.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
process.exitCode = result.status === "PASS" ? 0 : 1;
