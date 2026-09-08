import { chromium, type BrowserContext } from "@playwright/test";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";

const base = process.env.CITY_BROWSER_URL || "http://127.0.0.1:35178";
assert(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Local app only",
);
const out = resolve("evidence/browser-zoom");
await mkdir(out, { recursive: true });
await mkdir(".runtime", { recursive: true });
const temp = await mkdtemp(resolve(".runtime/zoom-"));
const extension = resolve(temp, "extension");
await mkdir(extension);
await writeFile(
  resolve(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Agent City isolated zoom verification",
    version: "1.0",
    permissions: ["tabs"],
    background: { service_worker: "worker.js" },
  }),
);
await writeFile(
  resolve(extension, "worker.js"),
  "chrome.runtime.onInstalled.addListener(() => {});",
);
let context: BrowserContext | undefined;
const result: any = {
  method: "chrome.tabs.setZoom",
  source: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  at: new Date().toISOString(),
  cases: [],
  errors: [],
  scope:
    "Actual browser tab zoom, isolated Chromium profile, retained real observations; no new agent execution. Not a browser-menu interaction test.",
};
const deadline = setTimeout(() => {
  void context?.close();
  process.exitCode = 1;
}, 60000);
try {
  context = await chromium.launchPersistentContext(resolve(temp, "profile"), {
    headless: true,
    channel: "chromium",
    executablePath: await localChromiumPath(),
    viewport: null,
    args: [
      "--window-size=1280,1000",
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  result.browser = context.browser()?.version();
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 10000 }));
  const page = context.pages()[0];
  page.on("pageerror", (e) => result.errors.push(e.message));
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForSelector("#roster button", { timeout: 15000 });
  const baseline = await page.evaluate(() => ({
    dpr: devicePixelRatio,
    width: innerWidth,
  }));
  for (const factor of [1, 1.25, 2, 1]) {
    const actual = await worker.evaluate(
      async ({ base, factor }) => {
        const api = (globalThis as any).chrome;
        const tabs = await api.tabs.query({});
        const tab = tabs.find((t: any) => t.url?.startsWith(base));
        if (!tab) throw new Error("Owned application tab missing");
        await api.tabs.setZoom(tab.id, factor);
        return api.tabs.getZoom(tab.id);
      },
      { base, factor },
    );
    assert.equal(actual, factor, "Browser did not apply requested zoom");
    await page.waitForFunction(
      ({ baseline, factor }) =>
        Math.abs(devicePixelRatio / baseline.dpr - factor) < 0.02,
      { baseline, factor },
      { timeout: 5000 },
    );
    await page.locator("#roster button").first().focus();
    const instance = await page
      .locator("#roster button")
      .first()
      .getAttribute("data-instance");
    await page.keyboard.press("Enter");
    const selected = await page.locator("#selection").textContent();
    assert(selected && selected !== "Select an observed execution.");
    const layout = await page.evaluate(() => ({
      dpr: devicePixelRatio,
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      focused: document.activeElement?.matches("#roster button") === true,
      focusedInstance: (document.activeElement as HTMLElement)?.dataset
        .instance,
      roster: document.querySelectorAll("#roster button").length,
    }));
    assert.equal(
      layout.overflow,
      false,
      "Native browser zoom causes horizontal overflow",
    );
    assert(layout.focused && layout.roster > 0, "Keyboard roster unusable");
    assert.equal(
      layout.focusedInstance,
      instance,
      "Focus changed execution identity",
    );
    result.cases.push({ factor, actual, ...layout, keyboard: true });
    await page.evaluate(() => scrollTo(0, 0));
    // Capture native device pixels without Playwright's CSS-sized clip: that
    // clip crops the right/bottom at non-default native tab zoom.
    const cdp = await context.newCDPSession(page);
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      resolve(out, `zoom-${factor}.png`),
      Buffer.from(shot.data, "base64"),
    );
    await cdp.detach();
  }
  assert.deepEqual(result.errors, []);
  result.baseline = baseline;
  result.restored = result.cases.at(-1).dpr === baseline.dpr;
  assert(result.restored, "Original zoom not restored");
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} catch (error) {
  await writeFile(
    resolve(out, "failure.json"),
    JSON.stringify({ ...result, failure: String(error) }, null, 2),
  );
  throw error;
} finally {
  clearTimeout(deadline);
  await context?.close();
  await rm(temp, { recursive: true, force: true });
}
