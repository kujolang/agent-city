import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { portAvailable } from "./startup-checks";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import {
  initialTruth,
  reduceTruth,
  type OperationEvent,
} from "../packages/world-core/index";

const out = "evidence/browser-visibility";
await mkdir(".runtime", { recursive: true });
const profile = await mkdtemp(".runtime/visibility-profile-");
let windows: unknown;
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
let chromeProcess: ChildProcess | undefined;
const deadline = setTimeout(() => {
  void browser?.close();
  chromeProcess?.kill("SIGTERM");
  void server.close();
  process.exitCode = 1;
}, 60000);
try {
  await server.listen();
  let context: BrowserContext;
  if (process.env.CITY_VISIBILITY_NO_DEFAULTS === "1") {
    const debugPort = 18995;
    assert(await portAvailable(debugPort), "Diagnostic CDP port occupied");
    chromeProcess = spawn(
      await localChromiumPath(),
      [
        "--remote-debugging-address=127.0.0.1",
        "--remote-debugging-port=" + debugPort,
        "--user-data-dir=" + resolve(profile),
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    let debugReady = false;
    for (let i = 0; i < 100; i++) {
      debugReady = await fetch(`http://127.0.0.1:${debugPort}/json/version`, {
        signal: AbortSignal.timeout(500),
      })
        .then((r) => r.ok)
        .catch(() => false);
      if (debugReady) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(debugReady, "Isolated Chrome did not expose CDP");
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`, {
      noDefaults: true,
    });
    context = browser.contexts()[0];
  } else {
    context = await chromium.launchPersistentContext(profile, {
      headless: false,
      executablePath: await localChromiumPath(),
      viewport: { width: 1280, height: 900 },
      ignoreDefaultArgs: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
      ],
    });
    browser = context.browser()!;
  }
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
  await page.bringToFront();
  await page.goto("http://127.0.0.1:18890", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForFunction(() => (window as any).agentCity?.rendererReady);
  await page.locator("#roster button").first().click();
  await page.locator("#follow").click();
  const cdp = await context.newCDPSession(page);
  // The alternative CDP mode prevents default focus emulation at attachment.
  if (process.env.CITY_VISIBILITY_NO_DEFAULTS !== "1")
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  const { targetId: backgroundTarget } = await cdp.send("Target.createTarget", {
    url: "about:blank",
    newWindow: false,
    background: false,
    browserContextId: targetInfo.browserContextId,
  });
  const sourceWindow = await cdp.send("Browser.getWindowForTarget", {
    targetId: targetInfo.targetId,
  });
  const coverWindow = await cdp.send("Browser.getWindowForTarget", {
    targetId: backgroundTarget,
  });
  windows = {
    source: sourceWindow.windowId,
    cover: coverWindow.windowId,
    profile:
      process.env.CITY_VISIBILITY_NO_DEFAULTS === "1"
        ? "fresh persistent / CDP noDefaults"
        : "fresh persistent",
    sameWindow: sourceWindow.windowId === coverWindow.windowId,
  };
  assert.equal(
    sourceWindow.windowId,
    coverWindow.windowId,
    "Native tabs must share one window",
  );
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
        windows,
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
        windows,
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
  if (
    chromeProcess &&
    chromeProcess.exitCode === null &&
    chromeProcess.signalCode === null
  ) {
    chromeProcess.kill("SIGTERM");
    await new Promise<void>((done) => {
      const timeout = setTimeout(() => {
        chromeProcess?.kill("SIGKILL");
        done();
      }, 3000);
      chromeProcess!.once("exit", () => {
        clearTimeout(timeout);
        done();
      });
    });
  }
  await server.close();
}
