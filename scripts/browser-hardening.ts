import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
const executablePath =
  process.env.CHROMIUM_PATH ||
  "/Users/robertdevore/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell";
await mkdir("evidence/hardening", { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const results: any = { browser: browser.version(), cases: [], errors: [] };
try {
  for (const dpr of [1, 1.25, 2]) {
    const context = await browser.newContext({
      deviceScaleFactor: dpr,
      viewport: { width: dpr === 2 ? 320 : 1280, height: 1000 },
      reducedMotion: dpr === 2 ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => results.errors.push(e.message));
    await page.goto("http://127.0.0.1:5178");
    await page.waitForSelector("#roster button");
    await page.locator("#roster button").first().focus();
    await page.keyboard.press("Enter");
    assert.notEqual(
      await page.locator("#selection").textContent(),
      "Select an observed execution.",
    );
    const latency = await page.evaluate(() => {
      const t = performance.now();
      (document.querySelector("#roster button") as HTMLElement).click();
      return performance.now() - t;
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    await page.locator("#archive summary").click();
    await page.locator("#archive-refresh").click();
    await page.waitForSelector("#archive-run option", { state: "attached" });
    await page.locator("#archive-replay").click();
    await page.waitForFunction(() => (window as any).agentCity.replayMode);
    const order = await page.evaluate(
      () => (window as any).agentCity.truth.order,
    );
    await page.waitForTimeout(1100);
    assert.equal(
      await page.evaluate(() => (window as any).agentCity.truth.order),
      order,
    );
    await page.screenshot({
      path: `evidence/hardening/replay-dpr-${dpr}.png`,
      fullPage: true,
    });
    await page.locator("#archive-live").click();
    await page.waitForFunction(() => !(window as any).agentCity.replayMode);
    const frames = await page.evaluate(async () => {
      const times: number[] = [];
      let prev = performance.now();
      for (let i = 0; i < 120; i++)
        await new Promise<void>((r) =>
          requestAnimationFrame((t) => {
            times.push(t - prev);
            prev = t;
            r();
          }),
        );
      return times.sort((a, b) => a - b);
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.25 });
    results.cases.push({
      dpr,
      width: dpr === 2 ? 320 : 1280,
      keyboard: true,
      overflow,
      inspectorSynchronousMs: latency,
      replayIsolated: true,
      frameMs: { p50: frames[60], p95: frames[114] },
      zoom: "CDP pageScaleFactor1.25; not browser UI zoom",
      reducedMotion: await page.evaluate(
        () => (window as any).agentCity.paused,
      ),
    });
    if (dpr === 1) {
      const loss = await page.evaluate(() => {
        const c = document.querySelector("canvas");
        const gl = c?.getContext("webgl2") || c?.getContext("webgl");
        const ext = gl?.getExtension("WEBGL_lose_context");
        if (!ext) return false;
        ext.loseContext();
        setTimeout(() => ext.restoreContext(), 250);
        return true;
      });
      await page.waitForTimeout(700);
      results.contextLoss = {
        extensionAvailable: loss,
        domUsable: (await page.locator("#roster button").count()) > 0,
        rendererReady: await page.evaluate(
          () => (window as any).agentCity.rendererReady,
        ),
      };
    }
    await context.close();
  }
  const noGPU = await chromium.launch({ headless: true, executablePath });
  const context = await noGPU.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5178?renderer=off");
  await page.waitForSelector("#roster button");
  assert.equal(await page.locator("canvas").count(), 0);
  results.initializationFailure = {
    method:
      "Explicit DOM-only mode throws before renderer initialization; hardware exhaustion not tested",
    fallback: await page.locator("#canvas").textContent(),
    roster: await page.locator("#roster button").count(),
  };
  await page.screenshot({
    path: "evidence/hardening/renderer-fallback.png",
    fullPage: true,
  });
  await context.close();
  await noGPU.close();
} finally {
  await browser.close();
  await writeFile(
    "evidence/hardening/browser.json",
    JSON.stringify(results, null, 2),
  );
}
console.log(JSON.stringify(results, null, 2));
