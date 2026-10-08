import { localChromiumPath } from "../apps/runner/browser-path";
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
    executablePath: await localChromiumPath(),
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
  // Explicit UI fixtures: no model or source operation is executed in this section.
  const fixtureId = "mission-00000000-0000-0000-0000-000000000123";
  const fixtureChecks = {
    exportName: "sum",
    cases: [{ name: "empty", args: [[]], equals: 0 }],
  };
  const fixtureJob = { id: fixtureId, kind: "code", status: "completed" };
  await page.route("**/control/status", (r) =>
    r.fulfill({
      json: {
        configured: true,
        model: "SYNTHETIC UI FIXTURE",
        endpoint: "",
        token: "fixture-only",
        storageHealthy: true,
        busy: false,
        jobs: [fixtureJob],
      },
    }),
  );
  await page.route("**/control/mission/" + fixtureId, (r) =>
    r.fulfill({
      json: {
        ...fixtureJob,
        prompt: "Original fixture task",
        functionContract: fixtureChecks,
      },
    }),
  );
  await page.route("**/control/exchanges/" + fixtureId, (r) =>
    r.fulfill({
      json: {
        records: [
          {
            producer: "fixture",
            run: "fixture",
            agent: "coder",
            requestOrdinal: 1,
            content: "<b>Fixture response</b>",
          },
        ],
        recordingComplete: true,
      },
    }),
  );
  await page.route("**/control/artifact/" + fixtureId, (r) =>
    r.fulfill({
      json: {
        kind: "code",
        content: "export function sum() {}",
        codeExecuted: false,
      },
    }),
  );
  await page.locator("#mission-jobs button:not([data-continue])").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-exchanges")
      ?.textContent?.includes("USER REQUEST\nOriginal fixture task"),
  );
  assert.equal(await page.locator("#mission-exchanges b").count(), 0);
  await page.locator(`[data-continue="${fixtureId}"]`).click();
  await page.waitForFunction(
    (id) =>
      document.querySelector("#continuation-status")?.textContent?.includes(id),
    fixtureId,
  );
  assert(await page.getByLabel("Task type").isDisabled());
  assert(await page.getByLabel("Function contract JSON").isVisible());
  assert.equal(
    await page
      .locator("#mission-options")
      .evaluate((e: HTMLDetailsElement) => e.open),
    true,
  );
  assert.deepEqual(
    JSON.parse(await page.getByLabel("Function contract JSON").inputValue()),
    fixtureChecks,
  );
  assert.equal(
    await page.getByLabel("Read local MCP demo README").isChecked(),
    false,
  );
  await page
    .getByLabel("Task", { exact: true })
    .fill("Repair the fixture output");
  let posted: any;
  await page.route("**/control/missions", async (r) => {
    posted = r.request().postDataJSON();
    await r.fulfill({ status: 202, json: { id: "fixture-new-execution" } });
  });
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector("#continuation-status")?.textContent ===
      "New mission",
  );
  assert.equal(posted.parentMissionId, fixtureId);
  assert.equal(posted.kind, "code");
  assert.deepEqual(posted.functionContract, fixtureChecks);
  assert(await page.getByLabel("Task type").isEnabled());
  await page.screenshot({
    path: resolve(out, "continuation-ui-fixture.png"),
    fullPage: true,
  });
  await page.getByText("Model connection", { exact: true }).click();
  await page.getByLabel("Chat completions endpoint").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => (document.activeElement as HTMLInputElement).name,
    ),
    "model",
  );
  for (const name of ["requestTimeoutSeconds", "maxOutputTokens", "apiKey"]) {
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(
        () => (document.activeElement as HTMLInputElement).name,
      ),
      name,
    );
  }
  assert.equal(
    await page.getByLabel("API key", { exact: true }).getAttribute("type"),
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
        continuationFormAndParentLink:
          "PASS / synthetic UI fixture; real runtime proof recorded separately",
        recordedUserRequestAndEscapedResponse: true,
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
