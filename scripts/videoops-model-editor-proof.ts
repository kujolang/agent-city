/** Continue the verified real preparation through the actual SDK Editor.
 * Does not claim a render or review; consumes immutable upstream attempts. */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { importCatalog } from "../apps/runner/agent-catalog";
import { readVideoopsAttempt } from "../apps/runner/videoops-artifacts";
import { runVideoopsStage } from "../apps/runner/videoops-stage";
import { videoopsEditorInstructions } from "../apps/runner/videoops-production";
import { validateVideoopsRenderInput } from "../apps/runner/videoops-render-input";
const upstream = JSON.parse(
  await readFile("evidence/videoops-model-preparation/proof.json", "utf8"),
);
assert.equal(upstream.status, "ready-for-editor");
const runtime = upstream.runtime;
const workspace = resolve(runtime, "production");
const attempt = Number(process.env.CITY_EDITOR_ATTEMPT || "1");
assert([1, 2].includes(attempt));
const repair =
  attempt === 2 ? await readFile(process.env.CITY_EDITOR_REPAIR!, "utf8") : "";
assert(repair.length < 16000);
const out = resolve(
  "evidence/videoops-model-editor",
  attempt === 1 ? "." : "attempt-2",
);
await mkdir(out, { recursive: true });
async function stored(stage: string) {
  const directory = resolve(
    workspace,
    ".videoops/attempts",
    stage,
    "1/artifacts",
  );
  return readVideoopsAttempt({
    directory,
    receipt: JSON.parse(
      await readFile(resolve(directory, "receipt.json"), "utf8"),
    ),
  });
}
const planning = await stored("creative-director");
const assets = await stored("asset-scout");
assert.deepEqual(planning, upstream.result.plan.bundle);
assert.deepEqual(assets, upstream.result.assets.bundle);
const origin = "http://127.0.0.1:24178";
const env = {
  ...process.env,
  CITY_RUNTIME_DIR: runtime,
  CITY_PORT_OFFSET: "19000",
  CITY_SOURCE_PREFIX: "videoops-model-",
  CITY_ENABLE_WORKCELL: "0",
  CITY_APP_URL: origin,
  CITY_CODEX_PORT: "24179",
};
const children: ReturnType<typeof spawn>[] = [];
function launch(script: string) {
  const c = spawn(process.execPath, ["--import", "tsx", script], {
    env,
    stdio: "ignore",
  });
  children.push(c);
  return c;
}
let uncertain = true;
try {
  launch("scripts/start.ts");
  const ready = Date.now() + 60000;
  while (true) {
    try {
      const response = await fetch(origin + "/control/status", {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) break;
    } catch {}
    assert(Date.now() < ready, "Observer startup timeout");
    await new Promise((r) => setTimeout(r, 250));
  }
  const oldModel = JSON.parse(
    await readFile(resolve(runtime, "control/model.json"), "utf8"),
  );
  launch("scripts/codex-provider.ts");
  let model = oldModel;
  const providerReady = Date.now() + 30000;
  while (model.apiKey === oldModel.apiKey) {
    assert(
      Date.now() < providerReady,
      "Provider did not rotate local credential",
    );
    await new Promise((r) => setTimeout(r, 250));
    model = JSON.parse(
      await readFile(resolve(runtime, "control/model.json"), "utf8"),
    );
  }
  model.maxOutputTokens = 8192;
  model.requestTimeoutSeconds = 300;
  const catalog = await importCatalog(resolve("../kujo-agents"));
  const profile = catalog.profiles.find(
    (p) => p.sourceId === "videoops.hyperframes-editor",
  )!;
  assert(profile);
  const { producer, run, task } = upstream.identity;
  const result = await runVideoopsStage({
    root: resolve("."),
    workspace,
    stage: "hyperframes-editor",
    attempt,
    producer,
    run: run + "-hyperframes-editor",
    task,
    profile,
    capabilities: profile.capabilities.required.map((capability) => ({
      capability,
      evidenceRef:
        capability === "filesystem" || capability === "repository"
          ? "runtime:bounded-stage-storage"
          : "operator:existing-codex-structured-text-contract",
      authority:
        capability === "filesystem" || capability === "repository"
          ? "runtime"
          : "operator",
    })),
    instructions: videoopsEditorInstructions,
    input: JSON.stringify({
      planning,
      assets,
      width: 640,
      height: 360,
      timing: { fps: 30, durationSeconds: 6 },
      repair,
      previousComposition:
        attempt === 2
          ? JSON.parse(
              await readFile(
                "evidence/videoops-model-editor/render-input.json",
                "utf8",
              ),
            ).composition
          : null,
      handoff: {
        scope:
          "Author stage-owned composition from exact verified upstream bundles; do not claim rendering or approval.",
      },
    }),
    model,
    spool: resolve(runtime, "spool-" + producer + ".jsonl"),
  });
  uncertain = result.receipt.timedOut || result.receipt.code !== 0;
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Actual SDK Editor consuming verified real preparation; rendering and review not established",
        upstreamRun: run,
        model: model.model,
        underlyingModel: "UNKNOWN",
        result,
        servicesRetained: uncertain,
      },
      null,
      2,
    ),
  );
  assert.equal(result.receipt.status, "artifacts-stored");
  assert(result.artifact);
  const composition = await readVideoopsAttempt(result.artifact);
  const input = {
    schema: "agent-city.videoops-render-input.v1",
    composition,
    width: 640,
    height: 360,
    fps: 30,
    durationSeconds: 6,
  };
  validateVideoopsRenderInput(input);
  await writeFile(
    resolve(out, "render-input.json"),
    JSON.stringify(input, null, 2),
  );
  const expected = (
    await readFile(resolve(runtime, "spool-" + producer + ".jsonl"), "utf8")
  )
    .trim()
    .split("\n").length;
  const deadline = Date.now() + 30000;
  let events: any[] = [];
  while (Date.now() < deadline) {
    const snapshot = await (
      await fetch(origin + "/api/world/snapshot", {
        signal: AbortSignal.timeout(3000),
      })
    ).json();
    events = snapshot.recent.filter((e: any) => e.source === producer);
    if (events.length === expected) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  await writeFile(
    resolve(out, "normalized.json"),
    JSON.stringify(events, null, 2),
  );
  assert.equal(events.length, expected);
  console.log(
    JSON.stringify({
      status: "PASS",
      stage: "hyperframes-editor",
      events: events.length,
      output: out,
    }),
  );
} finally {
  if (!uncertain)
    for (const child of children.reverse())
      if (child.exitCode === null) child.kill("SIGTERM");
}
