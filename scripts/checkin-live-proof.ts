import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const url = process.env.CITY_APP_URL || "http://127.0.0.1:6178";
const out = resolve("evidence/live-checkin");
await mkdir(out, { recursive: true });
const status = await (await fetch(url + "/control/status")).json();
assert(
  status.configured && !status.busy,
  "Start a configured, idle local Agent City first",
);
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator("#mission-form select[name=kind]").selectOption("kujo");
  await page
    .locator("#mission-form textarea[name=prompt]")
    .fill(
      "Use the explicit Kujo MCP catalog read. Before writing code, ask me which two numbers to add using the supported cityQuestion JSON check-in format. Wait for my reply, then write a minimal Kujo script defining add(a, b), calling it with my two numbers, and printing the result. Hand the draft to the senior reviewer. Do not claim execution.",
    );
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page.locator("#mission-form button[type=submit]").click();
  const response = await accepted;
  assert.equal(response.status(), 202);
  const mission = (await response.json()).id;
  const scenes = new Set<string>();
  let poll = true;
  const watcher = (async () => {
    while (poll) {
      try {
        scenes.add(await page.evaluate(() => (window as any).agentCity.scene));
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
  })();
  try {
    await page
      .locator("#reply-form")
      .waitFor({ state: "visible", timeout: 110_000 });
    await page.screenshot({
      path: resolve(out, "question.png"),
      fullPage: true,
    });
    await page.locator("#reply-form textarea").fill("Use 2 and 3.");
    await page.locator("#reply-form button").click();
    let result: any;
    const deadline = Date.now() + 200_000;
    while (Date.now() < deadline) {
      const final = await (await fetch(url + "/control/status")).json();
      result = final.jobs.find((j: any) => j.id === mission);
      if (["completed", "failed"].includes(result?.status)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(result?.status, "completed");
    const artifact = await (
      await fetch(url + "/control/artifact/" + mission)
    ).json();
    assert.equal(artifact.validation.syntax, "valid");
    const exchanges = await (
      await fetch(url + "/control/exchanges/" + mission)
    ).json();
    assert(
      exchanges.records.some(
        (e: any) => e.kind === "user.reply" && e.content === "Use 2 and 3.",
      ),
    );
    assert(
      exchanges.records.some(
        (e: any) => e.agent === "reviewer" && e.kind === "model.response",
      ),
    );
    await page.screenshot({
      path: resolve(out, "completed.png"),
      fullPage: true,
    });
    const state = await page.evaluate(() => (window as any).agentCity);
    const agents = Object.values(state.truth.agents).filter((a: any) =>
      a.id.includes(mission),
    ) as any[];
    const operations = agents.flatMap((a) =>
      Object.values(a.operations),
    ) as any[];
    assert(
      operations.some(
        (o) =>
          o.capability === "mcp.call" &&
          ["completed", "succeeded"].includes(o.status),
      ),
    );
    assert(operations.some((o) => o.capability === "agent.handoff"));
    assert(scenes.has("mcp"), "automatic mission follow should reach MCP room");
    assert.equal(errors.length, 0);
    await writeFile(
      resolve(out, "proof.json"),
      JSON.stringify(
        {
          status: "PASS",
          mission,
          model: status.model,
          runtime:
            "real Dispatch / Kujo SDK / public Kujo MCP / Codex ChatGPT text adapter",
          actualQuestion: exchanges.records.find(
            (e: any) => e.kind === "model.response",
          )?.content,
          reply: "Use 2 and 3.",
          reviewerObserved: true,
          syntax: artifact.validation.syntax,
          codeExecuted: artifact.codeExecuted,
          automaticScenes: [...scenes],
          browserErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS real model check-in, reply, handoff, Kujo check, automatic MCP follow:",
      mission,
    );
  } finally {
    poll = false;
    await watcher;
  }
} finally {
  await browser.close();
}
