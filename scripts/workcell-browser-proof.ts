import { localChromiumPath } from "../apps/runner/browser-path";
import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const proof = JSON.parse(
  await readFile(
    resolve(root, "evidence/mission-workcell/real/proof.json"),
    "utf8",
  ),
);
const source = resolve(root, proof.privateEvidence);
const runtime = resolve(root, ".runtime/workcell-browser-" + Date.now());
const out = resolve(root, "evidence/mission-workcell/browser");
await mkdir(runtime, { recursive: true, mode: 0o700 });
await mkdir(out, { recursive: true });
await writeFile(
  resolve(runtime, "jobs.json"),
  await readFile(resolve(source, "control/jobs.json")),
  { mode: 0o600 },
);
assert(await portAvailable(18889));
assert(await portAvailable(18998));
const children: ChildProcess[] = [];
async function launch(
  args: string[],
  env: Record<string, string>,
  url: string,
) {
  children.push(
    spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "ignore",
    }),
  );
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Browser proof service startup failed");
}
let browser;
try {
  await launch(
    ["--import", "tsx", "apps/runner/main.ts"],
    {
      CITY_CONTROL_DIR: runtime,
      CITY_MISSIONS_DIR: resolve(source, "missions"),
      CITY_CONTROL_PORT: "18998",
      CITY_WEB_ORIGIN: "http://127.0.0.1:18889",
      CITY_MODEL: "glm-5.3:cloud",
      CITY_MODEL_ENDPOINT: "http://127.0.0.1:11434/v1/chat/completions",
      CITY_MODEL_API_KEY: "",
      CITY_ENABLE_WORKCELL: "0",
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
    viewport: { width: 1280, height: 900 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:18889");
  await page
    .locator("#mission-jobs button:not([data-continue])")
    .first()
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-artifact")
      ?.textContent?.includes("EXECUTED IN WORKCELL"),
  );
  const text = await page.locator("#mission-artifact").textContent();
  assert(text?.includes('"output": "5\\n"'));
  assert(text?.includes('"cleanup": "complete"'));
  await page
    .locator("#mission-artifact")
    .screenshot({ path: resolve(out, "real-artifact.png") });
  await page.locator("#mission-artifact").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await page
    .locator("#mission-artifact")
    .screenshot({ path: resolve(out, "real-output.png") });
  const consent = page.getByRole("checkbox", { name: /Execute checked Kujo/ });
  assert.equal(await consent.isChecked(), false);
  // UI submission transport is intercepted: this section executes no task/model/container.
  let posted: any;
  await page.route("**/control/missions", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({ status: 202, json: { id: "ui-fixture-no-runtime" } });
  });
  await page.getByLabel("Task type").selectOption("kujo");
  await page
    .getByLabel("Task", { exact: true })
    .fill("UI consent test; intercepted, no execution");
  await consent.focus();
  await page.keyboard.press("Space");
  assert(await consent.isChecked());
  await page.getByText("Optional Kujo output check", { exact: true }).click();
  const outputCheck = page.getByRole("checkbox", {
    name: "Check exact stdout after Workcell execution",
  });
  await outputCheck.focus();
  await page.keyboard.press("Space");
  await page.getByLabel("Expected stdout", { exact: true }).fill("5\n");
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      !(document.querySelector('[name="executeWorkcell"]') as HTMLInputElement)
        .checked,
  );
  assert.equal(posted.executeWorkcell, true);
  assert.equal(posted.expectedOutput, "5\n");
  assert.equal(await outputCheck.isChecked(), false);
  await consent.check();
  await page.locator("[data-continue]").first().click();
  await page.waitForFunction(
    () =>
      !(document.querySelector('[name="executeWorkcell"]') as HTMLInputElement)
        .checked,
  );
  assert.equal(await consent.isChecked(), false);
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Real retained mission evidence served by local runner; intercepted submission only, no new runtime execution or visual travel claim",
        mission: proof.attempts[0].mission,
        browserVersion: browser.version(),
        realOutputVisible: true,
        cleanupVisible: true,
        keyboardConsent: true,
        explicitOutputCheckPostedAndReset: true,
        consentResetAfterSubmission: true,
        consentResetForContinuation: true,
        pageErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Browser real artifact and per-task consent: PASS");
} finally {
  await browser?.close();
  for (const child of children) {
    child.kill("SIGTERM");
    await new Promise<void>((done) => {
      if (child.exitCode !== null) return done();
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        done();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        done();
      });
    });
  }
}
