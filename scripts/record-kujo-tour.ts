/** Real configured-provider mission; records only the existing Pixi canvas. */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const url = process.env.CITY_APP_URL || "http://127.0.0.1:6178";
const out = resolve(process.env.CITY_VIDEO_DIR || "evidence/kujo-room-tour");
await mkdir(out, { recursive: true });
const status = await (
  await fetch(url + "/control/status", { signal: AbortSignal.timeout(5000) })
).json();
assert(
  status.configured && !status.busy,
  "A configured idle Agent City is required",
);
const prompt =
  "Write a small self-contained Kujo order-total calculator. First use the enabled local Kujo documentation retrieval and explicit Kujo MCP catalog read as reference context. Define subtotal(a, b, c) returning the sum of three item prices, and apply_discount(amount, discount) returning amount minus discount. Print the subtotal for prices 12, 8, 5 and the total after a discount of 5. Expected arithmetic values are 25 and 20. Use plain functions, numbers, return and print; no external dependencies. Return raw Kujo code. Hand it to the separate senior reviewer to check each requirement and grade the code. Do not claim execution or passing functional tests. No clarification is needed.";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const timeline: any[] = [];
const errors: string[] = [];
let mission = "";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator("#canvas canvas").waitFor();
  await page.locator("#mission-form select[name=kind]").selectOption("kujo");
  await page.locator("#mission-form input[name=useLocalDocs]").check();
  await page.locator("#mission-form input[name=allowCheckins]").uncheck();
  await page.locator("#mission-form textarea[name=prompt]").fill(prompt);
  await page
    .getByRole("button", { name: "Record game video", exact: true })
    .click();
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page.locator("#mission-form button[type=submit]").click();
  const response = await accepted;
  assert.equal(response.status(), 202);
  mission = (await response.json()).id;
  console.log("Recording real mission:", mission);
  const began = Date.now(),
    deadline = began + 230_000;
  let last = "",
    chosenChecker = false,
    terminal: any = null,
    nextPoll = 0,
    finishedAt = 0;
  const scenes = new Set<string>();
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const s = (window as any).agentCity;
      return {
        scene: s.scene,
        selected: s.selected,
        follow: s.follow,
        truth: s.truth,
        presentation: s.presentation,
      };
    });
    const agents = Object.values(state.truth.agents).filter((a: any) =>
      a.id.includes(mission),
    ) as any[];
    scenes.add(state.scene);
    const key = state.scene + ":" + state.selected;
    if (key !== last) {
      timeline.push({
        elapsedMs: Date.now() - began,
        scene: state.scene,
        instance: state.selected,
        follow: state.follow,
      });
      last = key;
      console.log(
        "Camera:",
        state.scene,
        state.selected?.split(":").at(-1) || "overview",
      );
    }
    // Explicit camera selection of the separate observed static-check execution, not an identity rewrite.
    const checker = agents.find((a) =>
      Object.values(a.operations).some(
        (o: any) => o.capability === "evaluation.run",
      ),
    );
    if (
      checker &&
      !chosenChecker &&
      scenes.has("library") &&
      scenes.has("mcp")
    ) {
      await page.locator("#roster button").evaluateAll((buttons, id) => {
        const b = buttons.find(
          (b) => (b as HTMLElement).dataset.instance === id,
        ) as HTMLButtonElement | undefined;
        if (!b) throw Error("Observed checker absent");
        b.click();
      }, checker.id);
      chosenChecker = true;
    }
    if (Date.now() >= nextPoll) {
      const live = await (await fetch(url + "/control/status")).json();
      terminal = live.jobs.find((j: any) => j.id === mission);
      nextPoll = Date.now() + 1000;
      if (["completed", "failed"].includes(terminal?.status) && !finishedAt)
        finishedAt = Date.now();
    }
    if (terminal?.status === "failed")
      throw Error("Real mission failed; retain recording and receipt");
    const walker = checker ? state.presentation.walkers[checker.id] : null;
    if (
      finishedAt &&
      chosenChecker &&
      scenes.has("dojo") &&
      walker?.phase === "work" &&
      walker.visits > 0 &&
      !walker.queued.length &&
      Date.now() - finishedAt > 12_000
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Stop / save video", exact: true })
    .click();
  await (await downloadEvent).saveAs(resolve(out, "agent-city-kujo-tour.webm"));
  const artifact = await (
    await fetch(url + "/control/artifact/" + mission)
  ).json();
  const final = await page.evaluate(() => (window as any).agentCity.truth);
  const agents = (Object.values(final.agents) as any[]).filter((a) =>
    a.id.includes(mission),
  );
  const operations = agents.flatMap((a) => Object.values(a.operations));
  await writeFile(resolve(out, "order-total.kujo"), artifact.draft || "");
  await writeFile(resolve(out, "senior-review.md"), artifact.content || "");
  const report = {
    mission,
    model: status.model,
    prompt,
    status: terminal?.status,
    syntax: artifact.validation?.syntax,
    codeExecuted: artifact.codeExecuted,
    canvasOnly: true,
    synthetic: false,
    scenes: [...scenes],
    timeline,
    operations,
    browserErrors: errors,
  };
  await writeFile(resolve(out, "proof.json"), JSON.stringify(report, null, 2));
  assert.equal(terminal?.status, "completed");
  assert.equal(artifact.validation?.syntax, "valid");
  for (const scene of ["library", "mcp", "dojo"])
    assert(scenes.has(scene), "Missing recorded room " + scene);
  assert.equal(errors.length, 0);
  console.log("PASS canvas-only real Kujo tour:", out);
} finally {
  await browser.close();
}
