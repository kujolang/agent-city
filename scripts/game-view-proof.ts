/** Controlled empty observer world: visual/layout proof, not real activity. */
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { initialTruth } from "../packages/world-core/index";
import { localChromiumPath } from "../apps/runner/browser-path";
const out = "evidence/game-view";
await mkdir(out, { recursive: true });
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18891, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [],
    writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    `window.EventSource=class extends EventTarget {static CLOSED=2;readyState=1;close(){this.readyState=2;}}`,
  );
  await page.route("**/api/**", (r) =>
    r.fulfill({
      json: {
        epoch: "empty-visual-fixture",
        truth: initialTruth(),
        order: 0,
        recent: [],
        cursor: "empty-visual-fixture:0",
        sourceHealth: { status: "UNKNOWN" },
      },
    }),
  );
  await page.route("**/control/**", (r) => {
    if (r.request().method() !== "GET") writes.push(r.request().url());
    return r.fulfill({
      json: {
        configured: false,
        storageHealthy: true,
        busy: false,
        jobs: [],
        token: "visual-fixture",
        endpoint: "",
        model: "",
        imported: false,
        profiles: [],
      },
    });
  });
  await page.goto("http://127.0.0.1:18891");
  await page.locator("#canvas canvas").waitFor();
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).agentCity.truth),
  );
  const button = page.locator("#game-fullscreen");
  await button.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => document.fullscreenElement === document.querySelector(".world"),
  );
  await page.waitForTimeout(250);
  const dimensions = await page
    .locator("#canvas canvas")
    .evaluate((e) => ({
      width: e.clientWidth,
      height: e.clientHeight,
      top: e.getBoundingClientRect().top,
    }));
  assert.equal(dimensions.width % 256, 0);
  assert.equal(dimensions.height % 240, 0);
  assert(dimensions.width >= 768);
  assert(dimensions.top + dimensions.height <= 960);
  for (const scene of [
    "city",
    "workshop",
    "library",
    "mcp",
    "meeting",
    "dispatch",
    "dojo",
  ]) {
    await page.locator(`[data-scene=${scene}]`).click();
    await page.waitForTimeout(150);
    await page
      .locator("#canvas canvas")
      .screenshot({ path: `${out}/${scene}.png` });
  }
  await button.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.fullscreenElement);
  assert(await button.evaluate((e) => e === document.activeElement));
  assert.equal(
    await page.evaluate(() => JSON.stringify((window as any).agentCity.truth)),
    before,
  );
  // Browser rejection is actionable, with DOM inspector still reachable.
  await page.evaluate(() => {
    document.querySelector(".world")!.requestFullscreen = () =>
      Promise.reject(Error("controlled denial"));
  });
  await button.click();
  await page.getByText(/Fullscreen unavailable/).waitFor();
  assert(await page.locator(".inspector-rail").isVisible());
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  await writeFile(
    `${out}/proof.json`,
    JSON.stringify(
      {
        status: "PASS",
        scope:
          "Controlled empty world; original actual Pixi scenes; no source/model/task activity",
        browser: browser.version(),
        dimensions,
        keyboardEnterAndExit: true,
        denialPreservesInspector: true,
        narrowOverflow: false,
        truthUnchanged: true,
        noCommandWrites: true,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: fullscreen keyboard entry/exit, integer scale, unchanged truth, rejection fallback, seven room captures",
  );
} finally {
  await browser.close();
  await server.close();
}
