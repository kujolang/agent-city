import { chromium, type Browser } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const out = "evidence/follow-viewport";
await mkdir(out, { recursive: true });
const retained = JSON.parse(
  await readFile("evidence/writing-context-order/proof.json", "utf8"),
).truth;
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18885, strictPort: true },
});
let browser: Browser | undefined;
const deadline = setTimeout(() => {
  void browser?.close();
  void server.close();
  process.exitCode = 1;
}, 60000);
const cases: any[] = [];
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  for (const width of [1280, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 600 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", (r) =>
      r.fulfill({
        json:
          new URL(r.request().url()).pathname === "/api/world/snapshot"
            ? { truth: retained, recent: [], sourceHealth: { status: "STALE" } }
            : { status: "STALE" },
      }),
    );
    await page.route("**/control/**", (r) =>
      r.fulfill({
        json: {
          configured: false,
          jobs: [],
          storageHealthy: true,
          busy: false,
        },
      }),
    );
    await page.goto("http://127.0.0.1:18885");
    await page.waitForSelector("#roster button");
    await page.locator("#roster button").first().click();
    const before = await page.evaluate(() => ({
      selected: (window as any).agentCity.selected,
      truth: JSON.stringify((window as any).agentCity.truth),
    }));
    await page.locator("#follow").scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    const offscreen = await page
      .locator(".world")
      .evaluate((el) => el.getBoundingClientRect().bottom < 0);
    // Keep the scrolled position while focusing, then use a real keyboard event.
    await page
      .locator("#follow")
      .evaluate((el: HTMLElement) => el.focus({ preventScroll: true }));
    await page.keyboard.press("Enter");
    const after = await page.evaluate(() => ({
      top: document.querySelector(".world")!.getBoundingClientRect().top,
      canvasTop: document.querySelector("#canvas")!.getBoundingClientRect().top,
      selected: (window as any).agentCity.selected,
      truth: JSON.stringify((window as any).agentCity.truth),
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    console.log(
      JSON.stringify({
        width,
        offscreen,
        worldTop: after.top,
        canvasTop: after.canvasTop,
      }),
    );
    assert(offscreen, "Test must begin with the world offscreen");
    assert(Math.abs(after.top) < 2, "Follow did not reveal world immediately");
    assert(after.canvasTop < 600, "Canvas remains below viewport");
    assert.equal(before.selected, after.selected);
    assert.equal(before.truth, after.truth);
    assert.equal(after.overflow, false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: out + "/width-" + width + ".png" });
    cases.push({
      width,
      height: 600,
      keyboard: true,
      reducedMotion: true,
      startedOffscreen: offscreen,
      worldTop: after.top,
      canvasTop: after.canvasTop,
      selectedIdentityUnchanged: true,
      truthUnchanged: true,
      overflow: after.overflow,
      errors,
    });
    await context.close();
  }
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        kind: "Controlled UI snapshot from retained real observations, no source execution",
        cases,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(cases));
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server.close();
}
