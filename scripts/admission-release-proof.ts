/** Controlled lost-receipt recovery through actual controller + DOM; no real-model claim. */
import { createServer as httpServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import { portAvailable } from "./startup-checks";
const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime/admission-release-" + randomUUID());
const control = resolve(runtime, "control"),
  missions = resolve(runtime, "missions");
await mkdir(control, { recursive: true });
await mkdir(missions, { recursive: true });
const id = "mission-" + randomUUID();
const original = {
  id,
  kind: "writing",
  status: "running",
  startedAt: new Date().toISOString(),
};
await writeFile(resolve(control, "jobs.json"), JSON.stringify([original]));
assert(await portAvailable(19909));
assert(await portAvailable(18892));
let calls = 0;
let releaseResponse!: () => void;
const responseGate = new Promise<void>((r) => {
  releaseResponse = r;
});
const provider = httpServer((req, res) => {
  req.resume();
  req.on("end", async () => {
    calls++;
    await responseGate;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: { content: "Controlled draft and review." },
          },
        ],
      }),
    );
  });
});
await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
const providerPort = (provider.address() as any).port;
const launch = () =>
  spawn(process.execPath, ["--import", "tsx", "apps/runner/main.ts"], {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      CITY_CONTROL_PORT: "19909",
      CITY_WEB_ORIGIN: "http://127.0.0.1:18892",
      CITY_CONTROL_DIR: control,
      CITY_MISSIONS_DIR: missions,
      CITY_RUNTIME_DIR: runtime,
      CITY_MODEL: "",
      CITY_MODEL_ENDPOINT: "",
    },
  });
let runner = launch();
const server = await createServer({
  root: "apps/web",
  server: {
    host: "127.0.0.1",
    port: 18892,
    strictPort: true,
    proxy: { "/control": "http://127.0.0.1:19909" },
  },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const out = resolve(root, "evidence/admission-release");
await mkdir(out, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.log("Browser error:", e.message);
  });
  await page.route("**/admission-proof", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><main><aside class="roster-rail"></aside><section class="world-column"><div class="world"></div></section><aside class="inspector-rail"></aside></main><script type="module">import {mountMissions} from '/missions.ts'; window.proofMissions=mountMissions(document.querySelector('.world-column'));</script></body></html>`,
    }),
  );
  await page.goto("http://127.0.0.1:18892/admission-proof");
  const release = page.locator("[data-release-admission]");
  await release.waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>("[data-release-admission]")!
        .disabled,
  );
  const status = async () =>
    (await page.request.get("http://127.0.0.1:18892/control/status")).json();
  const before = await status();
  assert(before.busy);
  assert.equal(before.jobs[0].status, "unknown");
  const send = async (data: any, token = before.token) =>
    page.request.post("http://127.0.0.1:18892/control/release-admission", {
      headers: {
        Origin: "http://127.0.0.1:18892",
        "X-City-Command-Token": token,
      },
      data,
    });
  assert.equal(
    (
      await send(
        { missionId: id, acknowledgedPossibleOngoingWork: true },
        "wrong",
      )
    ).status(),
    403,
  );
  assert.equal((await send({ missionId: id })).status(), 400);
  assert((await status()).busy);
  await page.evaluate(() => (window as any).proofMissions.setReplay(true));
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>("[data-release-admission]")!
        .disabled,
  );
  assert((await status()).busy);
  await page.evaluate(() => (window as any).proofMissions.setReplay(false));
  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>("[data-release-admission]")!
        .disabled,
  );
  page.once("dialog", (d) => d.dismiss());
  await release.click();
  assert((await status()).busy);
  page.once("dialog", (d) => d.accept());
  await release.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => !document.querySelector("[data-release-admission]"),
  );
  const released = await status();
  assert(!released.busy);
  assert.equal(released.jobs[0].status, "unknown");
  assert.equal(released.jobs[0].finishedAt, undefined);
  assert(released.jobs[0].admissionReleased);
  assert.equal(calls, 0);
  assert.equal(
    (
      await send({ missionId: id, acknowledgedPossibleOngoingWork: true })
    ).status(),
    200,
  );
  assert.deepEqual(
    (await status()).jobs[0].admissionRelease,
    released.jobs[0].admissionRelease,
  );
  await page
    .locator(".mission-panel")
    .screenshot({ path: resolve(out, "released.png") });
  await page.getByText("Model connection", { exact: true }).click();
  await page
    .locator("input[name=endpoint]")
    .fill(`http://127.0.0.1:${providerPort}/v1/chat/completions`);
  await page.locator("input[name=model]").fill("controlled-admission-proof");
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page
    .locator("#mission-form textarea[name=prompt]")
    .fill("Write a short draft for a separate reviewer.");
  await page
    .getByLabel("Allow agent questions (reply within 3 minutes)")
    .uncheck();
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const response = await accepted;
  assert.equal(response.status(), 202);
  const newId = (await response.json()).id;
  assert.equal(
    (
      await send({ missionId: id, acknowledgedPossibleOngoingWork: true })
    ).status(),
    409,
  );
  releaseResponse();
  let final: any;
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    final = await status();
    if (final.jobs.find((j: any) => j.id === newId)?.status === "completed")
      break;
    await page.waitForTimeout(200);
  }
  assert.equal(
    final.jobs.find((j: any) => j.id === newId)?.status,
    "completed",
  );
  assert.equal(final.jobs.find((j: any) => j.id === id)?.status, "unknown");
  assert.equal(calls, 2);
  assert.equal(final.jobs.length, 2);
  assert.deepEqual(errors, []);
  const saved = JSON.parse(
    await readFile(resolve(control, "jobs.json"), "utf8"),
  );
  assert(saved.find((j: any) => j.id === id).admissionRelease);
  const exited = new Promise((r) => runner.once("exit", r));
  runner.kill("SIGTERM");
  await exited;
  runner = launch();
  let restarted: any;
  for (let i = 0; i < 100; i++) {
    try {
      restarted = await status();
      if (restarted.jobs?.length === 2 && !restarted.busy) break;
    } catch {}
    await page.waitForTimeout(100);
  }
  assert.equal(restarted?.busy, false);
  assert.equal(restarted.jobs.find((j: any) => j.id === id).status, "unknown");
  assert.deepEqual(
    restarted.jobs.find((j: any) => j.id === id).admissionRelease,
    released.jobs[0].admissionRelease,
  );
  assert.equal(calls, 2);

  // Controlled late receipt: admission release must not freeze UNKNOWN forever.
  await mkdir(resolve(missions, id), { recursive: true });
  await writeFile(
    resolve(missions, id, "receipt.json"),
    JSON.stringify({
      ...original,
      status: "completed",
      code: 0,
      finishedAt: new Date().toISOString(),
    }),
  );
  const late = await status();
  assert.equal(late.jobs.find((j: any) => j.id === id).status, "completed");
  assert.deepEqual(
    late.jobs.find((j: any) => j.id === id).admissionRelease,
    released.jobs[0].admissionRelease,
  );
  assert.equal(
    (
      await send(
        { missionId: id, acknowledgedPossibleOngoingWork: true },
        late.token,
      )
    ).status(),
    409,
  );
  assert.equal(calls, 2);

  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        status: "PASS",
        scope:
          "Controlled lost receipt and model endpoint; actual controller, browser, SDK/Dispatch; no real-model claim",
        unknownMission: id,
        newMission: newId,
        unauthorized403: true,
        missingAcknowledgement400: true,
        replayDisabled: true,
        cancelLeavesQueueHeld: true,
        keyboardAcknowledgement: true,
        unknownPreserved: true,
        finishedAtNotInvented: true,
        sourceCallsDuringRelease: 0,
        newMissionProviderCalls: calls,
        idempotentRelease: true,
        decisionPersisted: true,
        restartPreservesDecisionAndUnknown: true,
        activeMissionRefusesRelease409: true,
        controlledLateReceiptReconcilesOutcome: true,
        terminalMissionRefusesRelease409: true,
        sourceRerun: false,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: explicit local queue release preserves UNKNOWN, persists acknowledgement, starts independent work; replay/cancel/unauthorized fail closed",
  );
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page)
    await writeFile(
      resolve(runtime, "browser-failure.txt"),
      await page.locator("body").innerText(),
    );
  throw error;
} finally {
  releaseResponse();
  await browser.close();
  await server.close();
  if (runner.exitCode === null && runner.signalCode === null) {
    const exit = new Promise((r) => runner.once("exit", r));
    runner.kill("SIGTERM");
    await exit;
  }
  provider.closeAllConnections();
  await new Promise<void>((r) => provider.close(() => r()));
}
