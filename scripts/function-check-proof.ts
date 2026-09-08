import { checkFunctions } from "../apps/runner/function-check";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

const contract = {
  exportName: "sum",
  cases: [
    { name: "empty", args: [[]], equals: 0 },
    { name: "numbers", args: [[2, -1, 4]], equals: 5 },
    { name: "reject string", args: [["2"]], throws: "TypeError" },
    { name: "reject null", args: [null], throws: "TypeError" },
  ],
};
const path = "evidence/live-missions/live-1788874992421-/code.json";
const retained = JSON.parse(await readFile(path, "utf8"));
const failed = await checkFunctions(retained.artifact.content, contract);
assert.equal(failed.status, "failed");
assert(failed.cases.every((c) => c.reason === "missing-export"));
const fixture = await checkFunctions(
  "export function sum(v) { if(!Array.isArray(v)||!v.every(x=>typeof x==='number'&&Number.isFinite(x))) throw new TypeError(); return v.reduce((a,b)=>a+b,0); }",
  contract,
);
assert.equal(fixture.status, "passed");
let hits = 0;
const server = createServer((_req, res) => {
  hits++;
  res.end("must-not-reach-worker");
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const probeURL = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
assert.equal(await (await fetch(probeURL)).text(), "must-not-reach-worker");
hits = 0;
let isolation;
try {
  isolation = await checkFunctions(
    `export async function probe() {
  let blocked = false; try { await fetch('${probeURL}'); } catch { blocked = true; }
  return [typeof process, typeof require, blocked];
}`,
    {
      exportName: "probe",
      cases: [
        {
          name: "no Node bindings or local service access",
          args: [],
          equals: ["undefined", "undefined", true],
        },
      ],
    },
  );
  assert.equal(isolation.status, "passed");
  assert.equal(
    hits,
    0,
    "Isolated code must not reach an actually listening local service",
  );
} finally {
  server.close();
}

const loop = await checkFunctions("export function run(){while(true){}}", {
  exportName: "run",
  cases: [{ name: "bounded loop", args: [], equals: 0 }],
});
assert.equal(loop.cases[0].reason, "timeout");
const forgery = await checkFunctions(
  "postMessage({kind:'returned',json:'true'});export function run(){return false}",
  {
    exportName: "run",
    cases: [
      { name: "module cannot impersonate harness", args: [], equals: true },
    ],
  },
);
assert.equal(forgery.status, "failed");
await mkdir("evidence/function-checks", { recursive: true });
await writeFile(
  "evidence/function-checks/proof.json",
  JSON.stringify(
    {
      passed: true,
      realArtifact: path,
      realFailure: failed,
      syntheticCorrectnessControl: fixture,
      isolation,
      loop,
      forgery,
    },
    null,
    2,
  ),
);
console.log(
  "Real model artifact fails explicit cases; sandbox/control/adversarial checks PASS",
);
