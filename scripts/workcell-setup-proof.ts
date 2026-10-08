import { localChromiumPath } from "../apps/runner/browser-path";
import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/workcell-setup-" + Date.now());
const out = resolve(root, "evidence/workcell-setup");
await mkdir(runtime, { recursive: true, mode: 0o700 });
await mkdir(out, { recursive: true });
assert(await portAvailable(18889));
assert(await portAvailable(18998));
const children: { child: ChildProcess; done: Promise<unknown> }[] = [];
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
  const done = new Promise((ok) => {
    child.once("exit", ok);
    child.once("error", ok);
  });
  children.push({ child, done });
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    if (child.exitCode !== null) throw Error("Owned service exited");
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Owned service did not start");
}
let browser;
try {
  await launch(
    ["--import", "tsx", "apps/runner/main.ts"],
    {
      CITY_CONTROL_DIR: resolve(runtime, "control"),
      CITY_MISSIONS_DIR: resolve(runtime, "missions"),
      CITY_CONTROL_PORT: "18998",
      CITY_WEB_ORIGIN: "http://127.0.0.1:18889",
      CITY_MODEL: "",
      CITY_MODEL_ENDPOINT: "",
      CITY_MODEL_API_KEY: "",
      CITY_ENABLE_WORKCELL: "1",
      CITY_WORKCELL_IMAGE: "trusted:local",
      DOCKER_CONTEXT: "",
      DOCKER_HOST: "unix://" + resolve(runtime, "absent.sock"),
    },
    "http://127.0.0.1:18998/control/status",
  );
  const denied = await fetch("http://127.0.0.1:18998/control/check-workcell", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:18889",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(denied.status, 403);
  await launch(
    ["node_modules/vite/bin/vite.js", "apps/web", "--port", "18889"],
    {
      CITY_CONTROL_URL: "http://127.0.0.1:18998",
    },
    "http://127.0.0.1:18889",
  );
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto("http://127.0.0.1:18889");
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-status")
      ?.textContent?.includes("MODEL NOT CONFIGURED"),
  );
  await page.locator("#mission-options > summary").focus();
  await page.keyboard.press("Enter");
  const summary = page.locator("summary", {
    hasText: "Workcell execution setup",
  });
  await summary.focus();
  await page.keyboard.press("Enter");
  const check = page.getByRole("button", { name: "Check Workcell setup" });
  await check.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document
      .querySelector("#workcell-check-status")
      ?.textContent?.includes("SETUP REQUIRED"),
  );
  const message = await page.locator("#workcell-check-status").textContent();
  assert(message?.includes("backend is unavailable"));
  assert.equal(
    await page
      .getByRole("checkbox", { name: /Execute checked Kujo/ })
      .isChecked(),
    false,
  );
  const state = await (
    await fetch("http://127.0.0.1:18998/control/status")
  ).json();
  assert.equal(state.configured, false);
  assert.deepEqual(state.jobs, []);
  assert.equal(
    await access(resolve(runtime, "missions"))
      .then(() => true)
      .catch(() => false),
    false,
  );
  await summary
    .locator("..")
    .screenshot({ path: resolve(out, "setup-required.png") });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Actual browser keyboard setup check with unconfigured model and unavailable private Docker endpoint",
        unauthorizedStatus: denied.status,
        message,
        modelConfigured: false,
        jobs: state.jobs,
        executionConsent: false,
        missionDirectoryCreated: false,
        screenshot: "setup-required.png",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Keyboard Workcell setup check, authorization, no implicit consent or mission: PASS",
  );
} finally {
  await browser?.close();
  for (const { child } of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  for (const { child, done } of children) {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await done;
    clearTimeout(timer);
  }
}
