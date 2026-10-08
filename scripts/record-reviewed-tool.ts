/** Explicit real model + isolated execution proof. Records only the live game canvas. */
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const root = resolve(import.meta.dirname, "..");
const url = process.env.CITY_APP_URL;
const runtime = process.env.CITY_VIDEO_RUNTIME;
assert(url && runtime, "Explicit owned app URL and runtime directory required");
const out = resolve(
  root,
  process.env.CITY_VIDEO_DIR || "evidence/reviewed-release-tool",
);
await mkdir(out, { recursive: true });
const status = await (await fetch(url + "/control/status")).json();
assert(status.configured && !status.busy, "Configured idle app required");
const input =
  "Improve first-run setup\n\n  Preserve failed attempts  \nExport reviewed artifacts\n";
const expected =
  "# Release notes\n\n- Improve first-run setup\n- Preserve failed attempts\n- Export reviewed artifacts\n";
const parentMission = process.env.CITY_PARENT_MISSION || "";
const repairNote = process.env.CITY_TOOL_REPAIR_NOTE || "";
const prompt =
  repairNote +
  "\n\n" +
  `Build a small usable Kujo release-notes generator. Read project/changes.txt at execution time; never hardcode its contents. Split on newline, trim each line, ignore blank lines, and turn each remaining line into a Markdown bullet. Produce '# Release notes' followed by one blank line then the bullets in their original order. The generated document has NO trailing newline. Write it to project/RELEASE-NOTES.md and print it exactly once (print supplies the final newline). Use read_file(path), split(text, "\\n"), trim(text), len, for-in, join and write_file(path, text, true), as needed. The attached source-guide.kujo is a real Kujo repository example for language syntax; do not execute or import that example. No network, external dependencies or host access. Use the enabled documentation/MCP reads. Senior reviewer: correct the code if needed, verify file input and blank-line handling, and grade the code in under150words. Return raw final Kujo in cityArtifact and separate honest review in cityReview using the required JSON envelope. The platform executes and checks output AFTER your review; do not claim those checks already passed.`;
const browser = await chromium.launch({
  headless: true,
  args:
    process.env.CITY_RECORD_SOFTWARE === "1"
      ? [
          "--use-gl=angle",
          "--use-angle=swiftshader-webgl",
          "--enable-unsafe-swiftshader",
        ]
      : [],
  executablePath: await localChromiumPath(),
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1080 },
  acceptDownloads: true,
});
const errors: string[] = [],
  timeline: any[] = [],
  downloads: Promise<void>[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("download", (d) =>
  downloads.push(d.saveAs(resolve(out, "release-notes-live.webm"))),
);
let mission = "",
  recording = false,
  terminal: any,
  failure = "";
const scenes = new Set<string>(),
  shown = new Set<string>();
try {
  await page.goto(url);
  await page.locator("#canvas canvas").waitFor();
  if (parentMission) {
    await page.locator(`[data-continue="${parentMission}"]`).click();
    await page.waitForFunction(
      () =>
        (document.querySelector("select[name=kind]") as HTMLSelectElement)
          .disabled,
    );
  } else {
    await page.getByLabel("Task type").selectOption("kujo");
    await page.getByText("Custom author / reviewer", { exact: true }).click();
    await page
      .getByRole("button", { name: "Refresh imported profiles", exact: true })
      .click();
    await page
      .locator(
        'select[name=authorProfile] option[value="kujolang/kujo-agents:chain.frontend-developer"]',
      )
      .waitFor({ state: "attached" });
    await page
      .getByLabel("Author profile")
      .selectOption("kujolang/kujo-agents:chain.frontend-developer");
    await page
      .getByLabel("Reviewer profile")
      .selectOption("kujolang/kujo-agents:chain.code-reviewer");
  }
  await page.locator("#mission-options > summary").click();
  await page.getByLabel("Use indexed local Kujo docs").check();
  await page.getByLabel("Read local MCP demo README").check();
  await page.getByText("Selected project files", { exact: true }).click();
  await page.locator("input[name=projectFiles]").setInputFiles([
    { name: "changes.txt", mimeType: "text/plain", buffer: Buffer.from(input) },
    {
      name: "source-guide.kujo",
      mimeType: "text/plain",
      buffer: await readFile(
        resolve(root, "../kujo/examples/project_markdown_converter.kujo"),
      ),
    },
  ]);
  await page.locator("input[name=executeWorkcell]").check();
  await page.locator("input[name=includeProjectFiles]").check();
  await page.getByText("Project files to export", { exact: true }).click();
  await page
    .locator("textarea[name=exportProjectFiles]")
    .fill("RELEASE-NOTES.md");
  await page.getByText("Optional Kujo output check", { exact: true }).click();
  await page.locator("input[name=checkOutput]").check();
  await page.locator("textarea[name=expectedOutput]").fill(expected);
  await page.locator("input[name=allowCheckins]").uncheck();
  await page.getByLabel("Task", { exact: true }).fill(prompt);
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const response = await accepted;
  const submitted = await response.json();
  assert.equal(response.status(), 202, JSON.stringify(submitted));
  mission = submitted.id;
  console.log("REAL mission " + mission);
  const began = Date.now(),
    deadline = began + 330000;
  let last = "",
    nextPoll = 0,
    finishedAt = 0,
    switchedReviewer = false,
    switchedChecker = false;
  while (Date.now() < deadline) {
    const s = await page.evaluate((id) => {
      const s = (window as any).agentCity;
      const agents = Object.values(s.truth.agents).filter((a: any) =>
        a.id.includes(id),
      );
      return {
        scene: s.scene,
        selected: s.selected,
        follow: s.follow,
        agents,
        walkers: s.presentation.walkers,
      };
    }, mission);
    if (!recording && s.scene === "workshop" && s.selected?.includes(mission)) {
      await page
        .getByRole("button", { name: "Record game video", exact: true })
        .click();
      recording = true;
    }
    if (recording) {
      scenes.add(s.scene);
      if (s.selected) shown.add(s.selected);
      const key = s.scene + ":" + s.selected;
      if (key !== last) {
        timeline.push({
          elapsedMs: Date.now() - began,
          scene: s.scene,
          selected: s.selected,
          follow: s.follow,
        });
        last = key;
        console.log("SCENE " + s.scene + " " + s.selected);
      }
    }
    const agents = s.agents as any[];
    const reviewer = agents.find(
      (a) =>
        /reviewer/.test(a.id) &&
        Object.values(a.operations).some(
          (o: any) => o.capability === "agent.run",
        ),
    );
    const checker = agents.find((a) =>
      Object.values(a.operations).some(
        (o: any) => o.capability === "evaluation.run",
      ),
    );
    const select = async (id: string) =>
      page.locator("#roster button").evaluateAll((buttons, id) => {
        const b = buttons.find(
          (b) => (b as HTMLElement).dataset.instance === id,
        ) as HTMLButtonElement | undefined;
        if (!b) throw Error("Observed instance not in DOM roster");
        b.click();
      }, id);
    const current = s.walkers[s.selected];
    if (
      recording &&
      !switchedReviewer &&
      reviewer &&
      scenes.has("library") &&
      scenes.has("mcp") &&
      current?.phase === "work" &&
      !current.queued.length
    ) {
      await select(reviewer.id);
      switchedReviewer = true;
    }
    if (Date.now() >= nextPoll) {
      const live = await (await fetch(url + "/control/status")).json();
      terminal = live.jobs.find((j: any) => j.id === mission);
      nextPoll = Date.now() + 1000;
      if (
        ["completed", "failed", "unknown"].includes(terminal?.status) &&
        !finishedAt
      )
        finishedAt = Date.now();
    }
    if (["failed", "unknown"].includes(terminal?.status))
      throw Error("Source task " + terminal.status + "; retain actual attempt");
    if (
      finishedAt &&
      checker &&
      !switchedChecker &&
      current?.phase === "work" &&
      !current.queued.length
    ) {
      await select(checker.id);
      switchedChecker = true;
    }
    if (
      finishedAt &&
      switchedChecker &&
      scenes.has("dojo") &&
      current?.phase === "work" &&
      !current.queued.length &&
      Date.now() - finishedAt > 15000
    )
      break;
    await page.waitForTimeout(150);
  }
  assert.equal(terminal?.status, "completed");
  assert(recording, "No actual Workshop start captured");

  const artifact = await (
    await fetch(url + "/control/artifact/" + mission)
  ).json();
  await writeFile(
    resolve(out, "artifact.json"),
    JSON.stringify(artifact, null, 2),
  );
  assert.equal(artifact.validation?.outputCheck?.status, "passed");
  assert.equal(artifact.codeExecuted, true);
  await copyFile(
    resolve(runtime, "missions", mission, "reviewed.kujo"),
    resolve(out, "release-notes.kujo"),
  );
  await writeFile(resolve(out, "changes.txt"), input);
  await writeFile(resolve(out, "senior-review.md"), artifact.content);
  for (const scene of ["workshop", "city", "library", "mcp", "dojo"])
    assert(scenes.has(scene), "Missing recorded " + scene);
  assert.equal(errors.length, 0);
} catch (e) {
  failure = e instanceof Error ? e.message : String(e);
} finally {
  try {
    if (
      recording &&
      (await page
        .getByRole("button", { name: "Stop / save video", exact: true })
        .isVisible())
    ) {
      const download = page
        .waitForEvent("download", { timeout: 15000 })
        .catch(() => null);
      await page
        .getByRole("button", { name: "Stop / save video", exact: true })
        .click({ timeout: 10000 });
      if (!(await download)) failure += " Recording download timed out.";
    }
    await Promise.all(downloads);
  } catch (e) {
    failure += " Capture cleanup: " + String(e);
  }
  if (mission)
    await page
      .screenshot({
        path: resolve(out, "completed-full-page.png"),
        fullPage: true,
        timeout: 5000,
      })
      .catch(() => {});
  const truth = await page
    .evaluate(() => (window as any).agentCity?.truth)
    .catch(() => null);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        mission,
        parentMission,
        softwareRecordingBrowser: process.env.CITY_RECORD_SOFTWARE === "1",
        model: status.model,
        prompt,
        status: terminal?.status,
        scope:
          "Real configured model task, local RAG/MCP, reviewer and isolated Workcell execution. Live canvas only; camera selections explicit, no replay or invented operations.",
        recordingBeginsAtFirstWorkshopObservation: true,
        scenes: [...scenes],
        shown: [...shown],
        timeline,
        agents: Object.values(truth?.agents || {}).filter((a: any) =>
          a.id.includes(mission),
        ),
        errors,
        failure,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
assert.equal(failure, "");
console.log("PASS real reviewed tool + canvas recording " + out);
