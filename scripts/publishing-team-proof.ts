/** Explicit real Publishing House task through an already configured, owned City. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const origin = process.env.CITY_BROWSER_URL;
if (!origin) throw Error("Explicit owned CITY_BROWSER_URL required");
const out = process.env.CITY_PROOF_OUTPUT || ".runtime/publishing-team-proof";
await mkdir(out, { recursive: true });
const author = "kujolang/kujo-agents:publishing-house.technical-editor-writer";
const reviewer = "kujolang/kujo-agents:publishing-house.copy-chief";
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const proof: any = {
  scope:
    "Real installed Publishing House PROPOSE author/reviewer workflow; no publishing or external workflow engine",
  author,
  reviewer,
  startedAt: new Date().toISOString(),
};
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  const before = await (
    await page.request.get(origin + "/control/status")
  ).json();
  assert(before.configured && !before.busy);
  proof.model = before.model;
  if (
    process.env.CITY_PROOF_MAX_TOKENS ||
    process.env.CITY_PROOF_MODEL ||
    process.env.CITY_PROOF_TIMEOUT_SECONDS
  ) {
    const limit = Number(process.env.CITY_PROOF_MAX_TOKENS || 8192);
    assert(Number.isInteger(limit) && limit >= 256 && limit <= 16384);
    await page.getByText("Model connection", { exact: true }).click();
    if (process.env.CITY_PROOF_MODEL) {
      await page
        .getByRole("button", { name: "Detect local Ollama", exact: true })
        .click();
      await page
        .locator("#local-models")
        .selectOption(process.env.CITY_PROOF_MODEL);
      proof.model = process.env.CITY_PROOF_MODEL;
    }
    await page.locator("input[name=maxOutputTokens]").fill(String(limit));
    if (process.env.CITY_PROOF_TIMEOUT_SECONDS) {
      const timeout = Number(process.env.CITY_PROOF_TIMEOUT_SECONDS);
      assert(Number.isInteger(timeout) && timeout >= 10 && timeout <= 300);
      await page
        .locator("input[name=requestTimeoutSeconds]")
        .fill(String(timeout));
      proof.requestTimeoutSeconds = timeout;
    }
    await page
      .getByRole("button", { name: "Save connection", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector("#mission-status")
        ?.textContent?.includes("Connection saved"),
    );
    proof.requestedMaxTokens = limit;
  }
  await page.getByText("Custom author / reviewer", { exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh imported profiles", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll("select[name=authorProfile] option").length > 1,
  );
  await page.locator("select[name=authorProfile]").selectOption(author);
  await page.locator("select[name=reviewerProfile]").selectOption(reviewer);
  await page
    .getByLabel("Allow agent questions (reply within 3 minutes)")
    .uncheck();
  await page.getByLabel("Task type").selectOption("writing");
  await page
    .getByLabel("Task", { exact: true })
    .fill(
      'Write a finished 70–100 word introduction titled "A clearer view of local agent work" using only these facts: Agent City is a local application. It visualizes observed agent activity. Current runtime truth is separate from animation. An author can hand a draft to a separate reviewer. Users can inspect the saved result. Include three concise bullets. Do not invent capabilities, quotes, performance claims or production readiness. This is a local draft for review, not authorization to publish. Reviewer: check factual support and clarity, and return the finished introduction separately from your commentary as required by the runtime.',
    );
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const response = await responsePromise;
  assert.equal(response.status(), 202);
  const accepted = await response.json();
  proof.jobId = accepted.id;
  const end =
    Date.now() +
    Math.max(300000, (proof.requestTimeoutSeconds || 90) * 2000 + 60000);
  while (Date.now() < end) {
    const status = await (
      await page.request.get(origin + "/control/status")
    ).json();
    proof.job = status.jobs.find((j: any) => j.id === accepted.id);
    if (!status.busy && ["completed", "failed"].includes(proof.job?.status))
      break;
    await page.waitForTimeout(1000);
  }
  assert.equal(proof.job?.status, "completed");
  proof.artifact = await (
    await page.request.get(origin + "/control/artifact/" + accepted.id)
  ).json();
  proof.exchanges = await (
    await page.request.get(origin + "/control/exchanges/" + accepted.id)
  ).json();
  assert.equal(proof.exchanges.records.length, 2);
  assert.equal(proof.job.profiles.author.id, author);
  assert.equal(proof.job.profiles.reviewer.id, reviewer);
  assert.match(proof.artifact.content, /A clearer view of local agent work/i);
  assert(!/Review findings|cityArtifact/.test(proof.artifact.content));
  const body = proof.artifact.content.replace(
    /^.*A clearer view of local agent work.*\n?/im,
    "",
  );
  proof.artifactChecks = {
    bodyWords: body
      .replace(/[#*`]/g, "")
      .trim()
      .split(/\s+/)
      .filter((word: string) => word !== "-").length,
    bullets: (body.match(/^\s*[-*]\s+\S/gm) || []).length,
  };
  assert(
    proof.artifactChecks.bodyWords >= 70 &&
      proof.artifactChecks.bodyWords <= 100,
  );
  assert.equal(proof.artifactChecks.bullets, 3);
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity?.truth.agents || {}).some(
        (a: any) =>
          a.id.includes(id) &&
          Object.values(a.operations).some(
            (o: any) =>
              o.capability === "agent.handoff" && o.status === "succeeded",
          ),
      ),
    accepted.id,
    { timeout: 10000 },
  );
  const snapshot = await (
    await page.request.get(origin + "/api/world/snapshot")
  ).json();
  proof.observedAgents = Object.values(snapshot.truth.agents).filter((a: any) =>
    a.id.includes(accepted.id),
  );
  assert.equal(proof.observedAgents.length, 2);
  assert.deepEqual(
    new Set(proof.observedAgents.map((a: any) => a.profile)),
    new Set([author, reviewer]),
  );
  assert.deepEqual(errors, []);
  proof.errors = errors;
  proof.status = "PASS";
  await page.waitForFunction(
    (id) =>
      [...document.querySelectorAll("#mission-jobs button")].some(
        (button) =>
          button.textContent?.includes(id.slice(-8)) &&
          button.textContent?.includes("completed"),
      ),
    accepted.id,
    { timeout: 15000 },
  );
  await page.screenshot({ path: out + "/completed.png", fullPage: true });
} catch (e) {
  proof.status = "FAIL";
  proof.error = String(e);
  process.exitCode = 1;
} finally {
  proof.finishedAt = new Date().toISOString();
  await writeFile(out + "/proof.json", JSON.stringify(proof, null, 2) + "\n");
  await browser.close();
  console.log(
    JSON.stringify({
      status: proof.status,
      jobId: proof.jobId,
      error: proof.error,
      out,
    }),
  );
}
