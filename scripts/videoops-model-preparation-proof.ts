/** Real provider preparation proof. Rendering is qualified separately until local engine is ready. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { prepareVideoops } from "../apps/runner/videoops-preparation";
import { importCatalog } from "../apps/runner/agent-catalog";

const runtime = resolve(".runtime/videoops-model-" + Date.now());
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
const out = "evidence/videoops-model-preparation";
await mkdir(out, { recursive: true });
const children: { child: ChildProcess; done: Promise<void> }[] = [];
function launch(script: string) {
  const child = spawn(process.execPath, ["--import", "tsx", script], {
    env,
    stdio: "ignore",
  });
  children.push({
    child,
    done: new Promise((ok, fail) => {
      child.once("exit", () => ok());
      child.once("error", fail);
    }),
  });
  return child;
}
const proof: any = {
  scope:
    "Real Codex-backed Kujo SDK Creative Director and Asset Scout; preparation only, no render or perceptual approval",
  runtime,
  model: "codex-cli-default",
  underlyingModel: "UNKNOWN",
  startedAt: new Date().toISOString(),
};
let uncertain = false;
const status = async () => {
  const r = await fetch(origin + "/control/status", {
    signal: AbortSignal.timeout(3000),
  });
  return r.json();
};
try {
  const imported = launch("scripts/import-agents.ts");
  await new Promise<void>((ok, fail) => {
    imported.once("exit", (code) =>
      code === 0 ? ok() : fail(Error("Catalog import failed")),
    );
  });
  launch("scripts/start.ts");
  let before: any;
  const ready = Date.now() + 60000;
  while (Date.now() < ready) {
    try {
      before = await status();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  assert(before, "Fresh app did not start");
  assert.equal(before.configured, false);
  assert.equal(before.jobs.length, 0);
  proof.initiallyUnconfigured = true;
  launch("scripts/codex-provider.ts");
  let configured: any;
  const configDeadline = Date.now() + 30000;
  while (Date.now() < configDeadline) {
    configured = await status();
    if (configured.configured) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(configured.configured);
  assert.equal(configured.model, "codex-cli-default");
  const connection = await fetch(origin + "/control/config", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-City-Command-Token": configured.token,
    },
    body: JSON.stringify({
      endpoint: configured.endpoint,
      model: configured.model,
      apiKey: "",
      maxOutputTokens: 8192,
      requestTimeoutSeconds: 300,
    }),
  });
  assert(connection.ok);
  const model = JSON.parse(
    await readFile(resolve(runtime, "control/model.json"), "utf8"),
  );
  const catalog = await importCatalog(resolve("../kujo-agents"));
  const profile = (stage: string) => {
    const p = catalog.profiles.find((p) => p.sourceId === "videoops." + stage);
    assert(p);
    return p;
  };
  const planner = profile("creative-director"),
    scout = profile("asset-scout");
  const capabilities = (p: typeof planner) =>
    p.capabilities.required.map((capability) => ({
      capability,
      evidenceRef:
        capability === "filesystem" ||
        capability === "repository" ||
        capability === "media-inspection"
          ? "runtime:bounded-stage-storage-and-provided-manifest-inspection"
          : "operator:existing-codex-structured-text-contract",
      authority:
        capability === "filesystem" ||
        capability === "repository" ||
        capability === "media-inspection"
          ? ("runtime" as const)
          : ("operator" as const),
    }));
  const workspace = resolve(runtime, "production");
  await mkdir(workspace, { mode: 0o700 });
  const producer = "videoops-model-" + Date.now(),
    run = "videoops-preparation-" + Date.now(),
    task = "videoops-title-card";
  const prompt =
    'Create a six-second silent original title-card video for Agent City, 640x360,30fps. Exact copy: "AGENT CITY" and "REAL AGENTS. VISIBLE WORK." Use navy background, bright blue original vector borders, white monospace typography. Reveal the title within the first half-second, hold it readable, introduce the second line at2seconds and hold both until the end. Use only original CSS/SVG shapes and system monospace: no logos, external media, downloaded fonts, voice, music or paid generation. Do not invent software capabilities or dialogue. Final production requires actual render and independent review; this stage only plans and resolves the supplied empty external-media requirements.';
  const contents: Record<string, string> = {
    "project-brief.md": prompt,
    "messaging.md": "Preserve the exact supplied copy. No other claims.",
    "audience.md": "Software users watching a short Agent City showcase.",
    "constraints.md":
      "Original silent typography/vector work only. No external media or acquisition. Do not invent licenses, completed operations or approval.",
    "references.md": "No external references supplied.",
    "platform.json": JSON.stringify({
      width: 640,
      height: 360,
      fps: 30,
      target_duration_seconds: 6,
    }),
  };
  proof.identity = { producer, run, task };
  proof.children = children.map((c) => c.child.pid);
  await writeFile(
    resolve(out, "in-progress.json"),
    JSON.stringify(proof, null, 2),
  );
  const result = await prepareVideoops({
    root: resolve("."),
    workspace,
    producer,
    run,
    task,
    spool: resolve(runtime, "spool-" + producer + ".jsonl"),
    model,
    planner,
    scout,
    capabilities: {
      planner: capabilities(planner),
      scout: capabilities(scout),
    },
    intake: Object.entries(contents).map(([name, content]) => ({
      path: "intake/" + name,
      content,
    })),
    timing: { fps: 30, durationSeconds: 6 },
    verifiedAssets: {},
  });
  uncertain = result.attempts.some((a) => a.uncertain === true);
  proof.result = result;
  proof.status = result.status;
  // Source work is already complete. Keep observation alive long enough to drain;
  // this wait never delays a business operation or turns presentation into truth.
  const expected = (
    await readFile(resolve(runtime, "spool-" + producer + ".jsonl"), "utf8")
  )
    .trim()
    .split("\n").length;
  const drainDeadline = Date.now() + 30000;
  let normalized: any[] = [];
  while (Date.now() < drainDeadline) {
    const snapshot = await (
      await fetch(origin + "/api/world/snapshot", {
        signal: AbortSignal.timeout(3000),
      })
    ).json();
    normalized = snapshot.recent.filter(
      (event: any) => event.source === producer,
    );
    if (normalized.length === expected) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  proof.observation = {
    expected,
    normalized: normalized.length,
    complete: normalized.length === expected,
  };
  await writeFile(
    resolve(out, "normalized.json"),
    JSON.stringify(normalized, null, 2),
  );
  proof.finishedAt = new Date().toISOString();
  proof.servicesRetained = uncertain;
  await writeFile(resolve(out, "proof.json"), JSON.stringify(proof, null, 2));
  assert.equal(
    result.status,
    "ready-for-editor",
    "Actual model preparation did not pass; attempts retained",
  );
  assert.equal(
    proof.observation.complete,
    true,
    "Source work completed but observation did not drain",
  );
  console.log(
    JSON.stringify({
      status: result.status,
      workspace,
      run,
      attempts: result.attempts,
    }),
  );
} finally {
  if (!uncertain) {
    for (const c of children.slice().reverse())
      if (c.child.exitCode === null) c.child.kill("SIGTERM");
    await Promise.allSettled(children.map((c) => c.done));
  }
}
