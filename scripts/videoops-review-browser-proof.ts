import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const origin = "http://127.0.0.1:18892";
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "apps/web",
    "--port",
    "18892",
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
let browser;
const requests: any[] = [];
const sha = "a".repeat(64);
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (i === 99) throw Error("Vite unavailable");
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage();
  await page.route(origin + "/", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<main id="host"></main><script type="module">import {showVideoopsReview} from "/videoops-review.ts";import {mountVideoopsLaunch} from "/videoops-launch.ts";showVideoopsReview(document.querySelector("#host"),"mission-fixture","fixture-token",()=>true).then(()=>{window.enableVideoops=mountVideoopsLaunch(document.querySelector("#host"),()=>"fixture-token",id=>window.startedVideo=id);});</script>',
    }),
  );
  await page.route("**/control/videoops/**", async (r) => {
    if (r.request().url().includes("/video/")) {
      await r.fulfill({
        contentType: "video/mp4",
        body: await readFile(
          resolve(root, "evidence/videoops-render/37792840086/draft.mp4"),
        ),
      });
      return;
    }
    if (r.request().method() === "POST") {
      const data = r.request().postDataJSON();
      requests.push(data);
      await r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: {
            state: "REVISION_REQUIRED",
            technical: "PASS",
            perceptual: "FAIL",
          },
        }),
      });
      return;
    }
    await r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: {
          state: "REVIEW_INCOMPLETE",
          technical: "PASS",
          perceptual: "NOT_REVIEWED",
          candidate: {
            sha256: sha,
            mandatory_capabilities: ["visual_playback"],
          },
        },
      }),
    });
  });
  const launches: any[] = [];
  await page.route("**/control/missions", async (r) => {
    launches.push(r.request().postDataJSON());
    await r.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ id: "mission-video-fixture", status: "running" }),
    });
  });
  await page.goto(origin);
  await page.getByRole("heading", { name: "VIDEO REVIEW" }).waitFor();
  assert(
    (await page.getByRole("status").textContent())?.includes("NOT_REVIEWED"),
  );
  await page.getByLabel("Your name").fill("Controlled reviewer");
  await page.getByLabel("Outcome").selectOption("FAIL");
  await page
    .getByLabel("Review notes")
    .fill("Controlled browser contract, not an actual video review");
  await page.getByLabel("Defects, one per line").fill("Fixture defect");
  await page.getByLabel("I watched the entire candidate").check();
  await page.getByLabel("I am recording my own review").check();
  await page.getByRole("button", { name: "Record review" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document
      .querySelector('[role="status"]')
      ?.textContent?.includes("REVISION_REQUIRED"),
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].candidateSha256, sha);
  assert.equal(requests[0].confirmed, true);
  await page.getByText("VideoOps production", { exact: true }).click();
  assert(
    await page
      .getByRole("button", { name: "Start video production" })
      .isDisabled(),
  );
  await page.evaluate(() => (window as any).enableVideoops(true));
  await page
    .getByLabel("Video production request")
    .fill("Original silent title card fixture");
  await page.getByLabel("Allow this task to render").check();
  await page.getByRole("button", { name: "Start video production" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => (window as any).startedVideo === "mission-video-fixture",
  );
  assert.equal(launches.length, 1);
  assert.equal(launches[0].allowRender, true);
  assert.equal(launches[0].workflow, "videoops");
  assert.equal(launches[0].prompt, "Original silent title card fixture");
  const out = resolve(root, "evidence/videoops-review-browser");
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: resolve(out, "review.png"), fullPage: true });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        scope:
          "Controlled DOM/API fixture only; no actual review approval or source execution",
        passed: true,
        checks: [
          "pending-distinct-from-pass",
          "exact-sha-submission",
          "keyboard-submit",
          "explicit-human-attestation",
          "failed-review-displayed",
          "operator-setup-required-for-launch",
          "explicit-render-consent",
          "keyboard-video-task-submission",
        ],
      },
      null,
      2,
    ),
  );
  console.log("VideoOps review browser contract PASS");
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
