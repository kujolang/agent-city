import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { canonical, replay, CORE_VERSION } from "../packages/world-core/replay";
import world from "../assets/compiled/world.json";
import type { CityEvent } from "../packages/protocol";
import { initialTruth } from "../packages/world-core";
const root = resolve(import.meta.dirname, ".."),
  runtime = resolve(root, ".runtime", "interaction-" + Date.now()),
  out = resolve(root, "evidence/interactive-observer");
await mkdir(runtime, { recursive: true });
await mkdir(out, { recursive: true });
const children: ChildProcess[] = [];
const hash = (v: unknown) =>
  createHash("sha256").update(canonical(v)).digest("hex");
const recorded = (
  await readFile(
    resolve(root, "tests/fixtures/phase1-observations.jsonl"),
    "utf8",
  )
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as CityEvent);
// Retained real observations, not generated semantic events. Select one source-qualified instance.
const mcpEvent = recorded.find(
  (e) => "operation" in e && e.operation.capability === "mcp.call",
)!;
assert("instance" in mcpEvent);
const id = mcpEvent.instance;
const events = recorded.filter((e) => "instance" in e && e.instance === id);
const body = {
  schema: "agent-city.replay.v1",
  versions: {
    protocol: "1",
    adapter: "1",
    core: CORE_VERSION,
    map: "1",
    coreHash: "test-browser-version-pin",
    mapHash: hash(world),
  },
  workspace: "local-agent-city",
  completeness:
    "partial: selected retained instance; other run events excluded",
  profileBindings: {},
  causalReferences: [],
  events,
  snapshot: replay(events),
};
const bundle = { ...body, checksum: hash(body) };
let calls = 0;
const requests: any[] = [];
const provider = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const request = JSON.parse(raw);
  requests.push(request);
  calls++;
  res.setHeader("Content-Type", "application/json");
  const content =
    calls === 1
      ? JSON.stringify({
          cityQuestion: "Should the example say hello to Ada or Grace?",
        })
      : calls === 2
        ? "Hello, Ada. This is the requested draft."
        : "Hello, Ada. Reviewed draft.";
  res.end(JSON.stringify({ choices: [{ message: { content } }] }));
});
await new Promise<void>((r) => provider.listen(18986, "127.0.0.1", r));
async function until(
  fn: () => Promise<any>,
  check: (v: any) => boolean,
  ms = 45_000,
) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (check(v)) return v;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error("Timed out waiting for proof condition");
}
async function launch(
  args: string[],
  env: Record<string, string>,
  url: string,
) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  children.push(child);
  await until(async () => (await fetch(url)).ok, Boolean);
}
let browser;
try {
  await launch(
    ["--import", "tsx", "apps/runner/main.ts"],
    {
      CITY_CONTROL_PORT: "18987",
      CITY_WEB_ORIGIN: "http://127.0.0.1:18887",
      CITY_CONTROL_DIR: runtime,
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_SOURCE_PREFIX: "fixture-chat-",
      CITY_RUNTIME_DIR: runtime,
      CITY_MODEL_ENDPOINT: "http://127.0.0.1:18986/v1/chat/completions",
      CITY_MODEL: "synthetic-question-fixture",
      CITY_MODEL_API_KEY: "",
    },
    "http://127.0.0.1:18987/control/status",
  );
  await launch(
    ["node_modules/vite/bin/vite.js", "apps/web", "--port", "18887"],
    { CITY_CONTROL_URL: "http://127.0.0.1:18987" },
    "http://127.0.0.1:18887",
  );
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data =
      path === "/api/world/snapshot" || path === "/api/world/status"
        ? {
            order: 0,
            truth: initialTruth(),
            recent: [],
            sourceHealth: { status: "UNKNOWN" },
            cursor: 0,
          }
        : path === "/api/archive/runs"
          ? { runs: [{ id: "retained-real-mcp" }], ledger: [] }
          : path === "/api/archive/replay"
            ? bundle
            : {};
    if (path === "/api/world/events") {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": browser fixture\n\n",
      });
      return;
    }
    await route.fulfill({ json: data });
  });
  await page.goto("http://127.0.0.1:18887");
  await page
    .locator("#mission-form textarea[name=prompt]")
    .fill("Write a short hello example. Ask me which name to use first.");
  await page.locator("#mission-form button[type=submit]").click();
  await page
    .locator("#reply-form")
    .waitFor({ state: "visible", timeout: 60_000 });
  assert.equal(calls, 1, "source must remain waiting rather than hand off");
  await page.screenshot({ path: resolve(out, "question.png"), fullPage: true });
  await page.locator("#reply-form textarea").fill("Use Ada, please.");
  await page.locator("#reply-form button").click();
  await until(
    async () =>
      (await (await fetch("http://127.0.0.1:18987/control/status")).json())
        .jobs[0],
    (j) => j.status === "completed",
  );
  assert.equal(calls, 3);
  assert(
    requests[1].messages.some(
      (m: any) => m.role === "user" && m.content === "Use Ada, please.",
    ),
  );
  await page
    .getByText("Hello, Ada. Reviewed draft.", { exact: true })
    .first()
    .waitFor({ timeout: 10_000 });
  const status = await (
    await fetch("http://127.0.0.1:18987/control/status")
  ).json();
  const ex = await (
    await fetch("http://127.0.0.1:18987/control/exchanges/" + status.jobs[0].id)
  ).json();
  assert.equal(
    ex.records.filter((e: any) => e.kind === "user.reply").length,
    1,
  );
  assert.equal(ex.checkpoint, null);
  const denied = await fetch("http://127.0.0.1:18987/control/reply", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:18887",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(denied.status, 403);
  await page.locator("#archive summary").click();
  await page.locator("#archive-refresh").click();
  await page.locator("#archive-replay").click();
  await page.waitForFunction(() => (window as any).agentCity.follow !== null);
  const callsBeforeReplay = calls;
  const scenes = new Set<string>();
  const deadline = Date.now() + 65_000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      scene: (window as any).agentCity.scene,
      order: (window as any).agentCity.truth.order,
    }));
    scenes.add(state.scene);
    if (scenes.has("mcp") && state.order === events.at(-1)!.order) break;
    await page.waitForTimeout(100);
  }
  assert(
    scenes.has("city") && scenes.has("mcp"),
    "replay follows actual retained MCP visit through portal",
  );
  assert.equal(calls, callsBeforeReplay, "replay must never call provider");
  await page
    .getByRole("button", { name: "Record game video", exact: true })
    .click();
  await page.waitForTimeout(1800);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Stop / save video", exact: true })
    .click();
  await (await downloadPromise).saveAs(resolve(out, "replay.webm"));
  await page.screenshot({ path: resolve(out, "replay.png"), fullPage: true });
  await page.locator("#replay-restart").click();
  await page.waitForFunction(
    () => Object.keys((window as any).agentCity.truth.agents).length > 0,
  );
  await page.locator("#pause").click();
  const before = await page.evaluate(
    () => (window as any).agentCity.truth.order,
  );
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.truth.order),
    before,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        status: "PASS",
        model: "synthetic question fixture (not live-model product proof)",
        runtime: "actual Dispatch and Kujo SDK",
        mission: status.jobs[0].id,
        replyForwarded: true,
        providerCalls: calls,
        unauthorizedReply: denied.status,
        replaySource: "retained real Phase 1 observations",
        replayScenes: [...scenes],
        replayReadOnly: true,
        video: "replay.webm",
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS interactive question/reply/handoff, retained real replay portals, pause, video export",
  );
} finally {
  await browser?.close();
  for (const child of children) child.kill("SIGTERM");
  provider.close();
}
