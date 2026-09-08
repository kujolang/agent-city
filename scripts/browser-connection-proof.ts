import { chromium, type Browser, type Route } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";

const out = "evidence/browser-connection";
await mkdir(out, { recursive: true });
const bundle = JSON.parse(
  await readFile("evidence/world-levels/replay.json", "utf8"),
);
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18889, strictPort: true },
});
let browser: Browser | undefined;
const deadline = setTimeout(() => {
  void browser?.close();
  void server.close();
  process.exitCode = 1;
}, 90000);
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage();
  const errors: string[] = [],
    writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let hold = false;
  const held: Route[] = [];
  const snapshot = {
    truth: bundle.snapshot,
    recent: [],
    sourceHealth: { status: "LIVE" },
    cursor: "controlled",
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") writes.push(path);
    if (path === "/api/world/snapshot") {
      if (hold) {
        held.push(route);
        return;
      }
      await route.fulfill({ json: snapshot });
    } else if (path === "/api/archive/runs")
      await route.fulfill({
        json: { runs: [{ id: "retained-real-run" }], ledger: [] },
      });
    else if (path === "/api/archive/replay")
      await route.fulfill({ json: bundle });
    else await route.fulfill({ status: 404, json: {} });
  });
  await page.route("**/control/**", (route) => {
    if (route.request().method() !== "GET") writes.push(route.request().url());
    return route.fulfill({
      json: { configured: false, missions: [], token: "controlled" },
    });
  });
  // Controlled transport permits delivery of obsolete callbacks after close.
  await page.addInitScript(`
    window.proofSources = [];
    window.EventSource = class extends EventTarget {
      static CLOSED = 2;
      readyState = 1;
      onerror = null;
      constructor() { super(); window.proofSources.push(this); }
      close() { this.readyState = 2; }
    };
  `);
  await page.goto("http://127.0.0.1:18889/?renderer=off");
  await page.waitForFunction(() => (window as any).agentCity?.truth.order > 0);
  await page.locator("#archive summary").click();
  await page.locator("#archive-refresh").click();
  await page.waitForSelector("#archive-run option", { state: "attached" });
  const replay = async () => {
    await page.locator("#archive-replay").click();
    await page.waitForFunction(() => (window as any).agentCity.replayMode);
  };
  const waitHeld = async (count: number) => {
    const until = Date.now() + 10000;
    while (held.length < count && Date.now() < until)
      await new Promise((r) => setTimeout(r, 25));
    assert(held.length >= count, "Expected a delayed snapshot request");
  };
  hold = true;
  await waitHeld(1); // health poll already in flight
  await replay();
  await held
    .shift()!
    .fulfill({ json: { ...snapshot, sourceHealth: { status: "STALE" } } });
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.health),
    "REPLAY",
  );
  await page.locator("#archive-live").click();
  await waitHeld(1); // reconnect snapshot now in flight
  await replay();
  await held
    .shift()!
    .fulfill({
      json: {
        ...snapshot,
        truth: { ...snapshot.truth, order: 999999, agents: {} },
      },
    })
    .catch(() => {});
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.truth.order),
    bundle.snapshot.order,
  );
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.health),
    "REPLAY",
  );
  assert.equal(
    await page.evaluate(() => (window as any).proofSources.length),
    1,
  );
  // A callback already queued from the closed stream cannot leave replay.
  await page.evaluate(() => {
    const old = (window as any).proofSources[0];
    old.onerror?.();
    old.dispatchEvent(new Event("reset"));
    old.dispatchEvent(
      new MessageEvent("world", { data: "malformed obsolete data" }),
    );
  });
  assert.equal(
    await page.evaluate(() => (window as any).agentCity.health),
    "REPLAY",
  );
  hold = false;
  await page.locator("#archive-live").click();
  await page.waitForFunction(
    () =>
      !(window as any).agentCity.replayMode &&
      (window as any).agentCity.health === "LIVE",
  );
  assert.equal(
    await page.evaluate(
      () =>
        (window as any).proofSources.filter((s: any) => s.readyState !== 2)
          .length,
    ),
    1,
  );
  // Simulate a lost stream delivery while EventSource still reports OPEN.
  const recoveredOrder = snapshot.truth.order + 1;
  snapshot.truth = { ...snapshot.truth, order: recoveredOrder };
  await page.waitForFunction(
    (order) => (window as any).agentCity.truth.order === order,
    recoveredOrder,
    { timeout: 5000 },
  );
  assert.equal(
    await page.evaluate(
      () =>
        (window as any).proofSources.filter((s: any) => s.readyState !== 2)
          .length,
    ),
    1,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  await page.screenshot({ path: out + "/recovered.png", fullPage: true });
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        kind: "Controlled browser transport regression using retained real replay data; no new source execution",
        browser: browser.version(),
        staleHealthCannotReplaceReplay: true,
        cancelledSnapshotCannotReplaceReplay: true,
        obsoleteCallbacksIgnored: true,
        liveReconnectHasOneStream: true,
        openButLaggingStreamResynchronized: true,
        errors,
        writes,
        limitations: [
          "DOM-only mode; does not qualify native hidden-tab suspension, browser UI zoom or renderer performance.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Delayed snapshot/replay/obsolete stream regression: PASS");
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server.close();
}
