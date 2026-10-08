import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const port = 18891;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "apps/web",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
let browser;
const requests: any[] = [];
const id = "mission-00000000-0000-0000-0000-000000000321";
const evidence = {
  schema: "agent-city.webops-evidence.v1",
  site: { id: "fixture", url: "https://example.com" },
  records: [
    {
      id: "f1",
      source: "browser-fixture",
      observedAt: "2026-10-08T00:00:00Z",
      kind: "finding",
      summary: "Fixture only",
    },
  ],
  unavailable: ["analytics"],
};
let jobs: any[] = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (i === 99) throw Error("Vite did not start");
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(origin + "/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<main id="host"><div class="world"></div></main><script type="module">import {mountMissions} from "/missions.ts";mountMissions(document.querySelector("#host"));</script>',
    }),
  );
  await page.route("**/control/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: any = {};
    if (path === "/control/status")
      body = {
        configured: true,
        model: "browser-fixture",
        endpoint: origin + "/fixture",
        token: "fixture",
        storageHealthy: true,
        busy: false,
        jobs,
      };
    else if (path === "/control/missions") {
      requests.push(route.request().postDataJSON());
      jobs = [
        { id, kind: "writing", status: "failed", prompt: "Fixture only" },
      ];
      body = { id };
    } else if (path.startsWith("/control/artifact/"))
      body = {
        kind: "writing",
        content: '{"fixture":"invalid report retained"}',
        workflowValidation: {
          workflow: "webops-report",
          status: "failed",
          reason: "Report claims an unsupported action or measurement",
        },
      };
    else if (path.startsWith("/control/exchanges/"))
      body = { records: [], recordingComplete: true };
    else if (path.includes("catalog") || path.includes("agents"))
      body = { profiles: [], teams: [], catalogs: [] };
    await route.fulfill({ json: body });
  });
  await page.goto(origin);
  await page.waitForFunction(
    () =>
      !(
        document.querySelector(
          '#mission-form button[type="submit"]',
        ) as HTMLButtonElement
      )?.disabled,
  );
  await page.selectOption('[name="workflow"]', "webops-report");
  assert(await page.locator('[name="kind"]').isDisabled());
  assert(await page.locator('[name="executeWorkcell"]').isDisabled());
  assert(await page.locator('[name="authorProfile"]').isDisabled());
  await page.fill('[name="prompt"]', "Summarize the supplied findings.");
  await page.fill('[name="workflowInput"]', "{invalid");
  await page.locator('#mission-form button[type="submit"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-status")
      ?.textContent?.includes("Invalid site evidence JSON"),
  );
  assert.equal(requests.length, 0);
  await page.fill('[name="workflowInput"]', JSON.stringify(evidence));
  await page.locator('#mission-form button[type="submit"]').click();
  await page.waitForFunction(
    () => document.querySelector("#mission-jobs button") !== null,
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].workflow, "webops-report");
  assert.equal(requests[0].kind, "writing");
  assert.deepEqual(requests[0].workflowInput, evidence);
  assert.equal(requests[0].profiles, undefined);
  assert.equal(requests[0].executeWorkcell, false);
  await page.locator("#mission-jobs button").first().click();
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-artifact")
      ?.textContent?.includes("WEBOPS REPORT CONTRACT: FAILED"),
  );
  assert(
    await page
      .locator("#mission-artifact")
      .textContent()
      .then((v) => v?.includes("unsupported action")),
  );
  assert(await page.locator("#download-artifact").isVisible());
  assert.equal(
    await page.locator("#download-artifact").textContent(),
    "Save failed report",
  );
  assert.deepEqual(errors, []);
  const out = resolve(root, "evidence/webops-browser");
  await mkdir(out, { recursive: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        schema: "agent-city.webops-browser-proof.v1",
        scope: "Controlled DOM/API fixture only; no model or source execution",
        passed: true,
        checks: [
          "explicit-workflow",
          "disabled-unavailable-grants",
          "invalid-json-no-submission",
          "writing-request-with-evidence",
          "failed-report-readable-and-downloadable",
        ],
        requests: requests.length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("WebOps browser contract: PASS");
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
