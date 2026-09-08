import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, ".."),
  out = resolve(root, "evidence/phase1");
await mkdir(out, { recursive: true });
const session = process.env.CITY_PROOF_SESSION || "phase1-" + Date.now(),
  kujo = resolve(root, "../kujo/target/release/kujo");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1360, height: 1100 },
  recordVideo: {
    dir: resolve(root, ".runtime/phase1-video"),
    size: { width: 1360, height: 1100 },
  },
});
const page = await context.newPage(),
  errors: string[] = [],
  receipts: any[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5178");
await page.waitForSelector("canvas");
async function shot(name: string) {
  await page.screenshot({ path: resolve(out, name + ".png"), fullPage: true });
}
async function run(
  name: string,
  repo: string,
  command: string,
  args: string[],
  extra: Record<string, string>,
  allowed = [0],
) {
  let output = "";
  const child = spawn(command, args, {
    cwd: resolve(root, "../" + repo),
    env: {
      ...process.env,
      KUJO_BIN: kujo,
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
      RAG_URL: "http://127.0.0.1:8791",
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const code = await new Promise<number | null>((ok, fail) => {
    child.on("exit", ok);
    child.on("error", fail);
  });
  receipts.push({ name, code, output });
  assert(allowed.includes(code!), name + ": " + output);
}
const env = (name: string) => ({
  CITY_PRODUCER: session + "-" + name,
  CITY_SPOOL: resolve(
    root,
    ".runtime/spool-" + session + "-" + name + ".jsonl",
  ),
});
async function agent(prefix: string) {
  await page.waitForFunction(
    (prefix) =>
      Object.keys((window as any).agentCity.truth.agents).some((id) =>
        id.startsWith(prefix),
      ),
    prefix,
    { timeout: 30000 },
  );
  return await page.evaluate(
    (prefix) =>
      Object.keys((window as any).agentCity.truth.agents).find((id) =>
        id.startsWith(prefix),
      )!,
    prefix,
  );
}
async function select(id: string) {
  await page
    .locator("#roster button")
    .filter({ hasText: id.split(":").at(-1) })
    .first()
    .click();
}
try {
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.scene),
    "city",
  );
  await shot("01-city");
  const mcpWork = run(
    "SDK through Dispatch calls real Kujo MCP",
    "dispatch",
    kujo,
    ["run", "examples/agent_city_observer.kujo", "--interpreter"],
    {
      ...env("mcp"),
      CITY_ACTOR: "mcp-worker",
      CITY_SDK_EXAMPLE: "examples/agent_city_mcp.kujo",
      CITY_ARTIFACT: resolve(root, ".runtime/mcp-artifact.json"),
    },
  );
  const mcpId = await agent(session + "-mcp");
  await select(mcpId);
  await page.locator("#follow").click();
  await mcpWork;
  await page.waitForFunction(
    (id) => {
      const s = (window as any).agentCity,
        w = s.presentation.walkers[id];
      return (
        w?.scene === "mcp" &&
        w.phase === "read" &&
        Object.values(s.truth.agents[id].operations).some(
          (o: any) => o.capability === "mcp.call" && o.status === "succeeded",
        )
      );
    },
    mcpId,
    { timeout: 60000 },
  );
  const mcp = await page.evaluate((id) => {
    const s = (window as any).agentCity;
    return {
      agent: s.truth.agents[id],
      walker: s.presentation.walkers[id],
      scene: s.scene,
    };
  }, mcpId);
  assert.equal(mcp.scene, "mcp");
  assert.equal(mcp.agent.status, "completed");
  assert.equal(mcp.agent.taskState, "completed");
  const call: any = Object.values(mcp.agent.operations).find(
    (o: any) => o.capability === "mcp.call",
  );
  assert.equal(call.metadata.server, "mcp-demo");
  assert.equal(call.metadata.tool, "read_project_docs");
  assert.equal(call.attempt, 1);
  assert(call.eventIds.length === 2);
  await shot("02-mcp-recent");
  await page
    .locator("#operations button")
    .filter({ hasText: "mcp.call" })
    .click();
  assert(
    (await page.locator("#record").innerText()).includes("result-returned"),
  );
  await shot("03-mcp-evidence");
  await page.locator("#close").click();
  const handoffWork = run(
    "SDK handoff and real RAG retrieval",
    "dispatch",
    kujo,
    ["run", "examples/agent_city_observer.kujo", "--interpreter"],
    { ...env("handoff"), CITY_ACTOR: "scout", CITY_HANDOFF: "1" },
  );
  const handoffId = await agent(session + "-handoff");
  await select(handoffId);
  if (
    (await page.locator("#follow").innerText()) !== "Follow selected instance"
  )
    await page.locator("#follow").click();
  await page.locator("#follow").click();
  await handoffWork;
  await page.waitForFunction(
    (id) => {
      const s = (window as any).agentCity,
        w = s.presentation.walkers[id];
      return w?.scene === "library" && w.phase === "read";
    },
    handoffId,
    { timeout: 60000 },
  );
  await shot("04-library");
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents[id].operations).some(
        (o: any) =>
          o.capability === "agent.handoff" && o.status === "succeeded",
      ),
    handoffId,
    { timeout: 30000 },
  );
  await page.locator("[data-scene=meeting]").click();
  await shot("05-meeting-handoff");
  const evalRun = "eval-" + Date.now();
  await run(
    "Eval attempt 1 real content failure",
    "eval",
    kujo,
    ["run", resolve(root, "integrations/kujo/evaluate.kujo"), "--interpreter"],
    {
      ...env("eval"),
      CITY_EVAL_RUN: evalRun,
      CITY_EVAL_ATTEMPT: "1",
      CITY_EVAL_ROOT: resolve(root, ".runtime"),
    },
  );
  const evalId = await agent(session + "-eval");
  await select(evalId);
  await page.locator("[data-scene=dojo]").click();
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents[id].operations).some(
        (o: any) => o.operationId === "content" && o.status === "failed",
      ),
    evalId,
    { timeout: 30000 },
  );
  await shot("06-dojo-failure");
  await run(
    "Correct input and rerun Eval attempt 2",
    "eval",
    kujo,
    ["run", resolve(root, "integrations/kujo/evaluate.kujo"), "--interpreter"],
    {
      ...env("eval"),
      CITY_EVAL_RUN: evalRun,
      CITY_EVAL_ATTEMPT: "2",
      CITY_EVAL_ROOT: resolve(root, ".runtime"),
    },
  );
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents[id].operations).some(
        (o: any) =>
          o.operationId === "content" &&
          o.attempt === 2 &&
          o.status === "succeeded",
      ),
    evalId,
    { timeout: 30000 },
  );
  await shot("07-dojo-repaired");
  await run(
    "Real Workcell preflight with host guardrails preserved",
    "agent-city",
    process.execPath,
    ["--import", "tsx", "integrations/kujo/workcell.ts"],
    env("workcell"),
    [0, 1],
  );
  const workcellId = await agent(session + "-workcell");
  await select(workcellId);
  await page.locator("[data-scene=workshop]").click();
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents[id].operations).some(
        (o: any) =>
          o.capability === "workcell.execute" && o.status !== "active",
      ),
    workcellId,
    { timeout: 30000 },
  );
  await shot("08-workcell");
  await select(mcpId);
  await page.locator("[data-scene=dispatch]").click();
  await shot("09-dispatch");
  await page.locator("#filter").selectOption("failed");
  assert((await page.locator("#roster button").count()) >= 1);
  await page.locator("#filter").selectOption("all");
  await page.locator("#pause").focus();
  await page.keyboard.press("Enter");
  assert(await page.evaluate(() => (window as any).agentCity.paused));
  const tick = await page.evaluate(
    () => (window as any).agentCity.presentation.tick,
  );
  await page.waitForTimeout(150);
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.presentation.tick),
    tick,
  );
  await page.keyboard.press("Enter");
  const snapshot = await (
    await fetch("http://127.0.0.1:7792/api/world/snapshot")
  ).json();
  const cohort = Object.values(snapshot.truth.agents).filter((a: any) =>
    a.id.startsWith(session),
  );
  assert.equal(cohort.length, 5);
  const evaluation: any = cohort.find((a: any) => a.id === evalId);
  assert(
    Object.values(evaluation.operations).some(
      (o: any) => o.status === "skipped",
    ),
  );
  assert(
    Object.values(evaluation.operations).some(
      (o: any) =>
        o.operationId === "content" && o.attempt === 1 && o.status === "failed",
    ),
  );
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "snapshot.json"),
    JSON.stringify(snapshot, null, 2),
  );
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        session,
        receipts,
        ids: { mcpId, handoffId, evalId, workcellId },
        mcp,
        errors,
        gates:
          "real MCP, Dispatch task, handoff, Library, failure/repair retained, Workcell guarded invocation, portals, inspectors, filters, keyboard pause",
        workcell: JSON.parse(
          await readFile(resolve(root, ".runtime/workcell-proof.json"), "utf8"),
        ),
      },
      null,
      2,
    ),
  );
  await page.locator("[data-scene=city]").click();
  await shot("10-city-cohort");
  const reduced = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 320, height: 850 },
  });
  const rp = await reduced.newPage();
  await rp.goto("http://127.0.0.1:5178");
  await rp.waitForSelector("canvas");
  assert(await rp.evaluate(() => (window as any).agentCity.paused));
  await rp.screenshot({
    path: resolve(out, "11-reduced-mobile.png"),
    fullPage: true,
  });
  await reduced.close();
  console.log("Phase 1 real Observer proof: PASS / " + session);
} finally {
  const video = page.video();
  await context.close();
  if (video)
    await copyFile(await video.path(), resolve(out, "observer-expansion.webm"));
  await browser.close();
}
