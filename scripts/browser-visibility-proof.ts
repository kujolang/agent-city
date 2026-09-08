import { chromium, type Browser, type Page } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import {
  initialTruth,
  reduceTruth,
  type OperationEvent,
} from "../packages/world-core/index";

const out = "evidence/browser-visibility";
await mkdir(out, { recursive: true });
const fixture = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const sample = fixture.find(
  (e) =>
    e.type === "operation.started" && e.operation.capability === "agent.run",
);
const base: OperationEvent = {
  ...sample,
  source: "synthetic-visibility",
  instance: "synthetic-visibility:worker",
  run: { namespace: "synthetic-visibility", id: "run" },
  eventId: "visibility-start",
  order: 1,
};
let truth = reduceTruth(initialTruth(), base);
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18890, strictPort: true },
});
let browser: Browser | undefined;
let observedPage: Page | undefined;
const deadline = setTimeout(() => {
  void browser?.close();
  void server.close();
  process.exitCode = 1;
}, 60000);
try {
  await server.listen();
  browser = await chromium.launch({
    headless: false,
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    executablePath: await localChromiumPath(),
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage(),
    errors: string[] = [];
  observedPage = page;
  page.on("pageerror", (e) => errors.push(e.message));
  let snapshots = 0;
  await page.route("**/api/**", (route) => {
    assert.equal(route.request().method(), "GET");
    if (new URL(route.request().url()).pathname === "/api/world/snapshot") {
      snapshots++;
      return route.fulfill({
        json: {
          truth,
          recent: [],
          sourceHealth: { status: "LIVE" },
          cursor: "controlled",
        },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.route("**/control/**", (route) =>
    route.fulfill({
      json: {
        configured: false,
        jobs: [],
        storageHealthy: true,
        busy: false,
        token: "controlled",
      },
    }),
  );
  await page.addInitScript(`
    window.visibilityObservations = [];
    document.addEventListener('visibilitychange', () => window.visibilityObservations.push(document.visibilityState));
    window.visibilitySources = [];
    window.EventSource = class extends EventTarget {
      static CLOSED = 2; readyState = 1;
      constructor() { super(); window.visibilitySources.push(this); }
      close() { this.readyState = 2; }
    };
  `);
  await page.goto("http://127.0.0.1:18890");
  await page.waitForFunction(() => (window as any).agentCity?.rendererReady);
  await page.locator("#roster button").first().click();
  await page.locator("#follow").click();
  const cdp = await context.newCDPSession(page);
  // Playwright enables focus emulation by default, keeping native pages visible.
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  const { targetId: backgroundTarget } = await cdp.send("Target.createTarget", {
    url: "about:blank",
    newWindow: false,
    background: false,
    browserContextId: targetInfo.browserContextId,
  });
  await cdp.send("Target.activateTarget", { targetId: backgroundTarget });
  await page.waitForFunction(
    () => document.visibilityState === "hidden",
    null,
    { timeout: 10000, polling: 100 },
  );
  const tick = await page.evaluate(
    () => (window as any).agentCity.presentation.tick,
  );
  const changes: OperationEvent[] = [];
  for (let i = 0; i < 12; i++) {
    const e: OperationEvent = {
      ...base,
      eventId: "visibility-retrieval-" + i,
      order: i + 2,
      type: "operation.finished",
      operation: {
        ...base.operation,
        id: "query-" + i,
        capability: "rag.query",
        outcome: "succeeded",
      },
    };
    changes.push(e);
    truth = reduceTruth(truth, e);
  }
  await page.evaluate((changes) => {
    const socket = (window as any).visibilitySources.at(-1);
    for (const event of changes)
      socket.dispatchEvent(
        new MessageEvent("world", { data: JSON.stringify(event) }),
      );
  }, changes);
  await page.waitForTimeout(1200);
  const hidden = await page.evaluate(() => {
    const a = (window as any).agentCity;
    return {
      visibility: document.visibilityState,
      tick: a.presentation.tick,
      order: a.truth.order,
      selected: a.selected,
      queued: Object.values(a.presentation.walkers).reduce(
        (n: number, w: any) => n + w.queued.length,
        0,
      ),
    };
  });
  assert.equal(hidden.visibility, "hidden");
  assert.equal(hidden.tick, tick);
  assert.equal(hidden.order, truth.order);
  assert(hidden.queued > 0);
  const beforeResume = snapshots;
  await cdp.send("Target.activateTarget", { targetId: targetInfo.targetId });
  await page.bringToFront();
  await page.waitForFunction(
    () =>
      document.visibilityState === "visible" &&
      (window as any).visibilitySources.length >= 2,
  );
  assert(snapshots > beforeResume);
  const resumed = await page.evaluate(() => {
    const a = (window as any).agentCity;
    return {
      selected: a.selected,
      order: a.truth.order,
      queued: Object.values(a.presentation.walkers).reduce(
        (n: number, w: any) => n + w.queued.length,
        0,
      ),
      rendererReady: a.rendererReady,
      visibilityEvents: (window as any).visibilityObservations,
    };
  });
  assert.equal(resumed.selected, hidden.selected);
  assert.equal(resumed.order, truth.order);
  assert.equal(resumed.queued, 0);
  assert(resumed.rendererReady);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: out + "/resumed.png" });
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        kind: "SYNTHETIC controlled transport, actual headed Chromium native tab visibility; no source execution",
        browser: browser.version(),
        hidden,
        resumed,
        hiddenTicksPaused: true,
        hiddenTruthUpdated: true,
        backlogCollapsed: true,
        selectedIdentityRetained: true,
        errors,
        limitations: [
          "Approximately 1.2 seconds hidden; not long-duration throttling, OS sleep, tab discard or a soak.",
          "Transport delivery controlled by fixture, not a live Watchdog workload.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Native hidden-tab truth and resume: PASS");
} catch (error) {
  const observation = await observedPage
    ?.evaluate(() => ({
      visibility: document.visibilityState,
      events: (window as any).visibilityObservations,
      order: (window as any).agentCity?.truth.order,
    }))
    .catch(() => null);
  await writeFile(
    out + "/failure.json",
    JSON.stringify(
      {
        status: "NOT_QUALIFIED",
        browser: browser?.version(),
        error: String(error),
        observation,
        reason:
          "A failure to reach native hidden state is not a passing resume test or proof of a product failure.",
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
  console.error(error);
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server.close();
}
