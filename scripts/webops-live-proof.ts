/** Explicit real Codex author/reviewer task in fresh local City configuration.
 * Reuses authorized CLI account; no new account signup or execution grant. */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
const runtime = resolve(".runtime/webops-live-" + Date.now());
const origin = "http://127.0.0.1:22178";
const env = {
  ...process.env,
  CITY_RUNTIME_DIR: runtime,
  CITY_PORT_OFFSET: "17000",
  CITY_SOURCE_PREFIX: "webops-live-",
  CITY_ENABLE_WORKCELL: "0",
  CITY_APP_URL: origin,
  CITY_CODEX_PORT: "22179",
};
const out = "evidence/webops-live";
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
    "Real WebOps supplied-evidence reporter and separate Copy Chief with Codex subscription; observed contract check; no website fetch, crawl, analytics, publishing or Workcell",
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
  const imported = launch("scripts/import-agents.ts");
  await new Promise<void>((ok, fail) => {
    imported.once("exit", (code) =>
      code === 0 ? ok() : fail(Error("Catalog import failed")),
    );
  });
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
  const ci = JSON.parse(
    await readFile("evidence/public-release/rc2/ci.json", "utf8"),
  );
  const input = {
    schema: "agent-city.webops-evidence.v1",
    site: {
      id: "agent-city-public-repository",
      url: "https://github.com/kujolang/agent-city",
    },
    records: [
      {
        id: "release-ci",
        source: ci.html_url,
        observedAt: new Date().toISOString(),
        kind: "measurement",
        summary: `Retained release CI receipt inspected now: run ${ci.id}, source ${ci.head_sha}, status ${ci.status}, conclusion ${ci.conclusion}. This is CI evidence, not website analytics or proof of every team workflow.`,
      },
      {
        id: "workflow-support",
        source: "docs/workflow-support.md",
        observedAt: new Date().toISOString(),
        kind: "finding",
        summary:
          "Current documented release is a local preview. Selected WebOps live acceptance and VideoOps production integration remain open. Catalog import alone is not execution proof.",
      },
    ],
    unavailable: [
      "website crawl",
      "analytics",
      "search performance",
      "historical comparison",
    ],
  };
  proof.input = input;
  await page.locator('[name="workflow"]').selectOption("webops-report");
  await page.locator('[name="workflowInput"]').fill(JSON.stringify(input));
  await page
    .getByLabel("Task", { exact: true })
    .fill(
      "Produce a concise supplied-evidence status report for the public Agent City repository. Clearly distinguish the passing release CI measurement from unsupported team workflow capabilities. Recommend one next verification action. Do not claim website checks, traffic improvements, deployment or resolved findings. Reviewer: verify references, scope and unavailable families; return corrected JSON report separately from your commentary.",
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
  assert.equal(proof.artifact.workflowValidation?.status, "passed");
  assert.equal(
    JSON.parse(proof.artifact.content).siteId,
    "agent-city-public-repository",
  );
  assert(!proof.artifact.content.includes("cityArtifact"));
  await page
    .locator("#mission-jobs button")
    .filter({ hasText: job.id.slice(-8) })
    .first()
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-artifact")
      ?.textContent?.includes("WEBOPS REPORT CONTRACT: PASSED"),
  );
  await page
    .locator("#mission-artifact")
    .screenshot({ path: out + "/report.png" });
  let snapshot: any;
  for (let i = 0; i < 40; i++) {
    snapshot = await (
      await page.request.get(origin + "/api/world/snapshot")
    ).json();
    if (
      snapshot.recent?.some(
        (e: any) =>
          e.source?.endsWith(job.id) &&
          e.operation?.id === "report-contract" &&
          e.type === "operation.finished" &&
          e.operation.outcome === "succeeded",
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(
    snapshot.recent?.some(
      (e: any) =>
        e.source?.endsWith(job.id) &&
        e.operation?.id === "report-contract" &&
        e.type === "operation.finished" &&
        e.operation.outcome === "succeeded",
    ),
    "Actual check must reach gateway semantic truth",
  );
  await writeFile(
    out + "/snapshot.json",
    JSON.stringify(snapshot, null, 2) + "\n",
  );
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
