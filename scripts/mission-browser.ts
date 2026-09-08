import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "evidence/visual-revision");
await mkdir(out, { recursive: true });
const children: ChildProcess[] = [];
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
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Browser verification service did not start");
}
let browser;
try {
  await launch(
    ["--import", "tsx", "apps/runner/main.ts"],
    {
      CITY_CONTROL_PORT: "18998",
      CITY_WEB_ORIGIN: "http://127.0.0.1:18889",
      CITY_CONTROL_DIR: resolve(
        root,
        ".runtime",
        "browser-missions-" + Date.now(),
      ),
      CITY_MODEL: "",
      CITY_MODEL_ENDPOINT: "",
      CITY_MODEL_API_KEY: "",
    },
    "http://127.0.0.1:18998/control/status",
  );
  await launch(
    ["node_modules/vite/bin/vite.js", "apps/web", "--port", "18889"],
    { CITY_CONTROL_URL: "http://127.0.0.1:18998" },
    "http://127.0.0.1:18889",
  );
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
  });
  const page = await browser.newPage({
    viewport: { width: 1360, height: 1100 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:18889");
  await page.waitForSelector("canvas");
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-status")
      ?.textContent?.includes("MODEL NOT CONFIGURED"),
  );
  assert(
    await page.getByRole("button", { name: "Start mission" }).isDisabled(),
  );
  for (const scene of [
    "city",
    "library",
    "workshop",
    "mcp",
    "meeting",
    "dojo",
    "dispatch",
  ]) {
    await page.locator(`[data-scene=${scene}]`).click();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: resolve(out, scene + ".png"),
      fullPage: true,
    });
  }
  await page.getByText("Model connection", { exact: true }).click();
  await page.getByLabel("Chat completions endpoint").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => (document.activeElement as HTMLInputElement).name,
    ),
    "model",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => (document.activeElement as HTMLInputElement).type,
    ),
    "password",
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: resolve(out, "mobile.png"), fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.goto("http://127.0.0.1:18889/?renderer=off");
  await page.waitForFunction(() =>
    document
      .querySelector("#canvas")
      ?.textContent?.includes("Rendering disabled"),
  );
  assert(await page.getByLabel("Task", { exact: true }).isVisible());
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "browser.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        browser: browser.version(),
        errors,
        rooms: 7,
        modelNotConfiguredHonest: true,
        keyboardSetup: true,
        mobile320NoOverflow: true,
        domOnlyTaskUI: true,
        screenshots:
          "Current rendering; retained source truth may be STALE. No new live AI proof claimed.",
      },
      null,
      2,
    ),
  );
  console.log(
    "Mission UI, seven rooms, keyboard setup, 320px and DOM-only: PASS",
  );
} finally {
  await browser?.close();
  for (const child of children) child.kill("SIGTERM");
}
