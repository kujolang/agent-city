import { readFile, writeFile } from "node:fs/promises";
const read = async (n: string) =>
  JSON.parse(await readFile("evidence/hardening/" + n + ".json", "utf8"));
const stress = await read("stress"),
  browser = await read("browser"),
  soak = await read("scale-soak"),
  recovery = await read("recovery");
const gates = {
  journalThroughput: stress.eventsPerSecond >= 1000 && stress.dropped === 0,
  endToEndStress: false,
  eightHourSoak: soak.soak.durationSeconds >= 28800,
  browser: browser.errors.length === 0 && browser.cases.length === 3,
  sourceIndependence: recovery.realOperation?.exitCode === 0,
  watchdogStoreEpoch: false,
};
const result = {
  status: Object.values(gates).every(Boolean) ? "PASS" : "FAIL",
  gates,
};
await writeFile(
  "evidence/hardening/release-gates.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
process.exitCode = result.status === "PASS" ? 0 : 1;
