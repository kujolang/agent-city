import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const pids = JSON.parse(await readFile(".runtime/pids.json", "utf8"));
const snapshot = async () =>
  (await fetch("http://127.0.0.1:7792/api/world/snapshot")).json();
let before;
for (let i = 0; i < 30; i++) {
  try {
    before = await snapshot();
    if (before.sourceHealth.status === "LIVE") break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
assert(before?.sourceHealth.status === "LIVE");
process.kill(pids.bridge, "SIGSTOP");
try {
  let stale;
  for (let i = 0; i < 65; i++) {
    stale = await snapshot();
    if (stale.sourceHealth.status === "STALE") break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal(stale.sourceHealth.status, "STALE");
  assert.match(stale.sourceHealth.lastError, /bridge/);
  assert.deepEqual(
    Object.values(stale.truth.agents).map((a: any) => a.status),
    Object.values(before.truth.agents).map((a: any) => a.status),
  );
  await writeFile(
    "evidence/bridge-health-proof.json",
    JSON.stringify(
      {
        bridgePaused: true,
        watchdogFeedStillReadable: true,
        status: stale.sourceHealth,
        truthOutcomesUnchanged: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Bridge loss visible independently of healthy Watchdog feed: PASS",
  );
} finally {
  process.kill(pids.bridge, "SIGCONT");
}
