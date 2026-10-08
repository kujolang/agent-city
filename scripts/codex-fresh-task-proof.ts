/** Explicit real Codex author/reviewer task in fresh local City configuration.
 * Reuses authorized CLI account; no new account signup or execution grant. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
const runtime = resolve(".runtime/codex-fresh-" + Date.now());
const origin = "http://127.0.0.1:21178";
const env = {
  ...process.env,
  CITY_RUNTIME_DIR: runtime,
  CITY_PORT_OFFSET: "16000",
  CITY_SOURCE_PREFIX: "codex-fresh-",
  CITY_ENABLE_WORKCELL: "0",
  CITY_APP_URL: origin,
  CITY_CODEX_PORT: "21179",
};
const out = "evidence/codex-onboarding/fresh-task";
await mkdir(out, { recursive: true });
const children: { child: ChildProcess; done: Promise<void> }[] = [];
function launch(script: string) {
  const child = spawn(process.execPath, ["--import", "tsx", script], {
    env,
    stdio: "ignore",
  });
  children.push({
    child,
    done: new Promise((ok, fail) => {
      child.once("exit", () => ok());
      child.once("error", fail);
    }),
  });
  return child;
}
const proof: any = {
  scope:
    "Real fresh City configuration with existing Codex subscription login; real author/reviewer; no account signup, MCP, Workcell or publishing",
  runtime,
  model: "codex-cli-default",
  underlyingModel: "UNKNOWN",
  startedAt: new Date().toISOString(),
};
let browser;
const status = async () => {
  const r = await fetch(origin + "/control/status", {
    signal: AbortSignal.timeout(3000),
  });
  return r.json();
};
try {
  launch("scripts/start.ts");
  let before: any;
  const ready = Date.now() + 60000;
  while (Date.now() < ready) {
    try {
      before = await status();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  assert(before, "Fresh app did not start");
  assert.equal(before.configured, false);
  assert.equal(before.jobs.length, 0);
  proof.initiallyUnconfigured = true;
  launch("scripts/codex-provider.ts");
  let configured: any;
  const configDeadline = Date.now() + 30000;
  while (Date.now() < configDeadline) {
    configured = await status();
    if (configured.configured) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(configured.configured);
  assert.equal(configured.model, "codex-cli-default");
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.getByText("Model connection", { exact: true }).click();
  await page
    .getByRole("button", { name: "Check model listing", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#model-check-status")
      ?.textContent?.includes("No prompt was sent"),
  );
  proof.modelListing = await page.locator("#model-check-status").textContent();
  await page
    .getByLabel("Allow agent questions (reply within 3 minutes)")
    .uncheck();
  await page.getByLabel("Task type").selectOption("writing");
  await page
    .getByLabel("Task", { exact: true })
    .fill(
      "Write a brief three-bullet checklist titled Local agent review. Use only these points: configure a model; submit a task; inspect the saved artifact and separate review. Do not claim any software was executed or deployed. Reviewer: verify those facts and return the finished checklist separately from review commentary using the required response contract.",
    );
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const response = await accepted;
  assert.equal(response.status(), 202);
  const job = await response.json();
  proof.jobId = job.id;
  const finish = Date.now() + 240000;
  while (Date.now() < finish) {
    const s = await status();
    proof.job = s.jobs.find((j: any) => j.id === job.id);
    if (["completed", "failed"].includes(proof.job?.status) && !s.busy) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(proof.job?.status, "completed");
  proof.artifact = await (
    await page.request.get(origin + "/control/artifact/" + job.id)
  ).json();
  const exchanges = await (
    await page.request.get(origin + "/control/exchanges/" + job.id)
  ).json();
  assert.equal(exchanges.records.length, 2);
  proof.exchangeCount = exchanges.records.length;
  assert.match(proof.artifact.content, /Local agent review/i);
  assert(!proof.artifact.content.includes("cityArtifact"));
  await page.screenshot({ path: out + "/completed.png", fullPage: true });
  assert.deepEqual(errors, []);
  proof.status = "PASS";
} catch (error) {
  proof.status = "FAILED";
  proof.error = String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  // Do not terminate an active task merely because the browser proof failed.
  let current: any;
  try {
    current = await status();
  } catch {}
  if (current?.busy) {
    proof.servicesRetainedForActiveMission = true;
    proof.ownedPids = children.map((c) => c.child.pid);
  } else {
    for (const c of children) c.child.kill("SIGTERM");
    await Promise.all(children.map((c) => c.done));
  }
  proof.finishedAt = new Date().toISOString();
  await writeFile(out + "/proof.json", JSON.stringify(proof, null, 2) + "\n");
  console.log(
    JSON.stringify({
      status: proof.status,
      error: proof.error,
      jobId: proof.jobId,
      active: proof.servicesRetainedForActiveMission ?? false,
    }),
  );
}
