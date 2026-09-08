import { execFileSync } from "node:child_process";
import { localChromiumPath } from "../apps/runner/browser-path";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
const executablePath = await localChromiumPath();
const base = process.env.CITY_BROWSER_URL || "http://127.0.0.1:5178";
const out = process.env.CITY_BROWSER_OUTPUT || "evidence/hardening";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const results: any = {
  browser: browser.version(),
  source: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  at: new Date().toISOString(),
  cases: [],
  errors: [],
};
const deadline = setTimeout(() => {
  void browser.close();
  process.exitCode = 1;
}, 90000);
try {
  for (const dpr of process.env.CITY_BROWSER_CONTEXT_ONLY === "1"
    ? [1]
    : [1, 1.25, 2]) {
    const context = await browser.newContext({
      deviceScaleFactor: dpr,
      viewport: { width: dpr === 2 ? 320 : 1280, height: 1000 },
      reducedMotion: dpr === 2 ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => results.errors.push(e.message));
    await page.goto(base);
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
    assert.equal(overflow, false, "Application overflows viewport");
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
      path: `${out}/replay-dpr-${dpr}.png`,
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
        (window as any).cityLossExtension = ext;
        return true;
      });
      assert(loss, "WebGL context-loss extension unavailable");
      await page.waitForFunction(
        () => {
          const c = document.querySelector("canvas");
          const gl = c?.getContext("webgl2") || c?.getContext("webgl");
          return gl?.isContextLost() === true;
        },
        null,
        { timeout: 5000, polling: 100 },
      );
      await page.evaluate(() =>
        (window as any).cityLossExtension.restoreContext(),
      );
      await page.waitForFunction(
        () => {
          const c = document.querySelector("canvas");
          const gl = c?.getContext("webgl2") || c?.getContext("webgl");
          return gl?.isContextLost() === false;
        },
        null,
        { timeout: 5000, polling: 100 },
      );
      await page.waitForTimeout(250);
      await page.screenshot({
        path: out + "/context-restored.png",
        fullPage: true,
      });
      results.contextLoss = {
        extensionAvailable: loss,
        lossObserved: true,
        contextRestored: true,
        domUsable: (await page.locator("#roster button").count()) > 0,
        rendererReady: await page.evaluate(
          () => (window as any).agentCity.rendererReady,
        ),
      };
    }
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(base + "?renderer=off");
  await page.waitForSelector("#roster button");
  assert.equal(await page.locator("canvas").count(), 0);
  results.initializationFailure = {
    method:
      "Explicit DOM-only mode throws before renderer initialization; hardware exhaustion not tested",
    fallback: await page.locator("#canvas").textContent(),
    roster: await page.locator("#roster button").count(),
  };
  await page.screenshot({
    path: out + "/renderer-fallback.png",
    fullPage: true,
  });
  await context.close();
  assert.deepEqual(results.errors, []);
} finally {
  clearTimeout(deadline);
  await browser.close();
  await writeFile(out + "/browser.json", JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
