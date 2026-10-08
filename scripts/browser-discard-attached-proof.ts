/** Actual Chrome tab discard/reload over a controlled truth transport. */
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import {
  initialTruth,
  reduceTruth,
  type OperationEvent,
} from "../packages/world-core";
const out = "evidence/browser-discard";
await mkdir(out, { recursive: true });
await mkdir(".runtime", { recursive: true });
const profile = await mkdtemp(".runtime/discard-browser-");
const extension = resolve(profile, "extension");
await mkdir(extension);
await writeFile(
  resolve(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Owned discard proof",
    version: "1.0",
    permissions: ["tabs"],
    background: { service_worker: "worker.js" },
  }),
);
await writeFile(
  resolve(extension, "worker.js"),
  "chrome.runtime.onInstalled.addListener(() => {});",
);
const template = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s))
  .find(
    (e) =>
      e.type === "operation.started" && e.operation.capability === "agent.run",
  );
const start: OperationEvent = {
  ...template,
  source: "synthetic-mission-discard",
  instance: "synthetic-mission-discard:run:worker",
  run: { namespace: "synthetic-mission-discard", id: "run" },
  eventId: "discard-start",
  order: 1,
};
let truth = reduceTruth(initialTruth(), start),
  jobStatus = "running",
  snapshots = 0;
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18894, strictPort: true },
});
await server.listen();
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  executablePath: await localChromiumPath(),
  viewport: { width: 1280, height: 960 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
  ],
  ignoreDefaultArgs: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const report: any = {
  scope:
    "SYNTHETIC snapshot transport, actual native Chrome discard and activation; no source execution or OS sleep",
  browser: context.browser()?.version(),
};
const writes: string[] = [];
const deadline = setTimeout(() => {
  void context.close();
}, 60_000);
try {
  await context.addInitScript(
    `window.EventSource=class extends EventTarget { readyState=1; close(){this.readyState=2;} };`,
  );
  await context.route("**/api/**", (route) => {
    if (route.request().method() !== "GET")
      writes.push(route.request().method());
    if (route.request().url().includes("/snapshot")) snapshots++;
    return route.fulfill({
      json: {
        epoch: "discard-fixture",
        truth,
        recent: [],
        order: truth.order,
        cursor: "discard-fixture:" + truth.order,
        sourceHealth: { status: "LIVE" },
      },
    });
  });
  await context.route("**/control/**", (route) => {
    if (route.request().method() !== "GET")
      writes.push(route.request().method());
    return route.fulfill({
      json: {
        configured: true,
        model: "controlled",
        storageHealthy: true,
        busy: jobStatus === "running",
        jobs: [{ id: "mission-discard", status: jobStatus }],
        token: "controlled",
        profiles: [],
        exchanges: [],
      },
    });
  });
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", { timeout: 10_000 }));
  const page = await context.newPage();
  report.stage = "load";
  await page.goto("http://127.0.0.1:18894");
  await page.locator(`[data-instance="${start.instance}"]`).click();
  report.stage = "follow";
  await page.waitForFunction(
    (id) => (window as any).agentCity.follow === id,
    start.instance,
  );
  const before = await page.evaluate(() => ({
    selected: (window as any).agentCity.selected,
    order: (window as any).agentCity.truth.order,
  }));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  report.stage = "hide";
  const tabs = await worker.evaluate(async () => {
    const api = (globalThis as any).chrome;
    const all = await api.tabs.query({});
    const tab = all.find((t: any) =>
      t.url?.startsWith("http://127.0.0.1:18894"),
    );
    if (!tab) throw Error("Source tab missing");
    const cover = await api.tabs.create({
      windowId: tab.windowId,
      url: "about:blank",
      active: true,
    });
    return { source: tab.id, cover: cover.id };
  });
  report.visibilityBeforeDiscard = await page.evaluate(
    () => document.visibilityState,
  );
  // A discarded tab must be verified via Chrome's native state, not a page reload shortcut.
  report.stage = "discard";
  const discarded = await worker.evaluate(async (id) => {
    const api = (globalThis as any).chrome;
    const result = await api.tabs.discard(id);
    return { discarded: result?.discarded, active: result?.active };
  }, tabs.source);
  report.discarded = discarded;
  assert.equal(discarded.discarded, true);
  truth = reduceTruth(truth, {
    ...start,
    eventId: "discard-failed",
    order: 2,
    type: "operation.failed",
    operation: { ...start.operation, outcome: "failed" },
  });
  jobStatus = "failed";
  report.stage = "resume";
  const beforeSnapshots = snapshots;
  await worker.evaluate(async (id) => {
    await (globalThis as any).chrome.tabs.update(id, { active: true });
  }, tabs.source);
  await page.waitForFunction(
    () =>
      (document as any).wasDiscarded === true &&
      (window as any).agentCity?.truth.order === 2,
    null,
    { timeout: 15_000 },
  );
  const after = await page.evaluate(() => ({
    selected: (window as any).agentCity.selected,
    follow: (window as any).agentCity.follow,
    truth: (window as any).agentCity.truth,
    wasDiscarded: (document as any).wasDiscarded,
    rendererReady: (window as any).agentCity.rendererReady,
    inspector: document.querySelector("#truth")?.textContent,
  }));
  assert.equal(
    after.selected,
    before.selected,
    "Exact selected instance must survive discard",
  );
  assert.deepEqual(after.truth, truth);
  assert.equal(after.inspector, "FAILED");
  assert(after.rendererReady);
  assert(snapshots > beforeSnapshots);
  assert.deepEqual(writes, []);
  report.before = before;
  report.after = after;
  report.snapshots = snapshots;
  report.writes = writes;
  await page.screenshot({ path: out + "/recovered.png" });
  report.status = "PASS";
} catch (error) {
  report.status = "FAILED";
  report.error = String(error);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await context.close();
  await server.close();
  await writeFile(
    out + (report.status === "PASS" ? "/proof.json" : "/failure.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: report.status,
      error: report.error,
      stage: report.stage,
      discarded: report.discarded,
    }),
  );
}
