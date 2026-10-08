/** Real installed-app onboarding; explicitly invokes the selected Ollama model. */
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.CITY_BROWSER_URL;
if (!origin) throw Error("Set CITY_BROWSER_URL to a fresh, owned installation");
const model = process.env.CITY_PROOF_MODEL;
if (!model) throw Error("Explicit CITY_PROOF_MODEL required");
const out = process.env.CITY_PROOF_OUTPUT || ".runtime/first-user-proof";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const result: any = {
  scope:
    "Fresh managed installation, existing local Ollama daemon; real author/reviewer, not final tool-building video",
  model,
  startedAt: new Date().toISOString(),
  jobs: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  const status = async () =>
    (await page.request.get(origin + "/control/status")).json();
  const before = await status();
  assert.equal(before.configured, false);
  assert.equal(before.jobs.length, 0);
  result.initiallyUnconfigured = true;
  await page.getByText("Model connection", { exact: true }).click();
  await page
    .getByRole("button", { name: "Detect local Ollama", exact: true })
    .click();
  await page.locator("#local-models").selectOption(model);
  assert.equal(await page.locator("input[name=apiKey]").inputValue(), "");
  await page.locator("input[name=maxOutputTokens]").fill("8192");
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-status")
      ?.textContent?.includes("Connection saved"),
  );
  await page.screenshot({ path: out + "/connection.png", fullPage: true });
  await page
    .getByLabel("Allow agent questions (reply within 3 minutes)")
    .uncheck();
  await page.getByLabel("Task type").selectOption("writing");
  await page.getByLabel("Use indexed local Kujo docs").check();
  await page.getByLabel("Read local MCP demo README").check();
  await page
    .getByLabel("Task", { exact: true })
    .fill(
      "Write a concise, factual introduction to this local MCP demo, using only the documentation supplied. Include three bullet points describing the tools it actually lists. Avoid invented capabilities. The reviewer should check factual support and clarity.",
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
  result.jobId = job.id;
  const deadline = Date.now() + 300000;
  let terminal: any;
  const scenes = new Set<string>();
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => (window as any).agentCity);
    if (state?.scene) scenes.add(state.scene);
    const s = await status();
    terminal = s.jobs.find((j: any) => j.id === job.id);
    if (["completed", "failed"].includes(terminal?.status) && !s.busy) break;
    await page.waitForTimeout(1000);
  }
  result.job = terminal;
  result.scenes = [...scenes];
  result.errors = errors;
  const artifact = await (
    await page.request.get(origin + "/control/artifact/" + job.id)
  ).json();
  const exchanges = await (
    await page.request.get(origin + "/control/exchanges/" + job.id)
  ).json();
  result.artifact = artifact;
  result.exchanges = exchanges;
  await page.waitForFunction(
    (id) =>
      document
        .querySelector("#mission-jobs")
        ?.textContent?.includes("completed") &&
      document
        .querySelector("#conversation-state")
        ?.textContent?.includes("COMPLETED"),
    job.id,
  );
  await page.screenshot({ path: out + "/completed.png", fullPage: true });
  assert.equal(terminal.status, "completed");
  assert.equal(exchanges.records.length, 2);
  assert.deepEqual(errors, []);
  result.status = "PASS";
} catch (e) {
  result.status = "FAIL";
  result.error = String(e);
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(out + "/proof.json", JSON.stringify(result, null, 2) + "\n");
  await browser.close();
  console.log(
    JSON.stringify({
      status: result.status,
      jobId: result.jobId,
      error: result.error,
      out,
    }),
  );
}
