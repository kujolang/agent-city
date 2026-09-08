// Explicit real Ollama + public Kujo MCP demo. Never part of npm test.
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:6178";
const codex = process.env.CITY_DEMO_CODEX === "1";
const out = codex
  ? "evidence/kujo-author-review-codex-checked"
  : "evidence/kujo-author-review";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const timer = setTimeout(() => void browser.close(), 240000);
try {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  if (!codex) {
    await page.getByText("Model connection", { exact: true }).click();
    await page
      .locator('[name="endpoint"]')
      .fill("http://127.0.0.1:11434/v1/chat/completions");
    await page.locator('[name="model"]').fill("qwen2.5-coder:1.5b-instruct");
    await page
      .getByRole("button", { name: "Save connection", exact: true })
      .click();
  }
  await page.waitForFunction(
    () =>
      !(document.querySelector("#mission-form button") as HTMLButtonElement)
        .disabled,
  );
  await page.selectOption('[name="kind"]', "kujo");
  await page
    .locator('[name="prompt"]')
    .fill(
      "Read the Kujo catalog entry through the configured MCP step. Write a Kujo script defining func add(a, b) that returns a + b, then print(add(2, 3)). Return only the script. The separate senior reviewer should grade it A-F or UNKNOWN, assess each requirement and state that it was not executed.",
    );
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const accepted = await (await response).json();
  assert(accepted.id);
  const scenes = new Set<string>();
  let followed = false,
    job: any;
  const started = Date.now();
  while (Date.now() - started < 210000) {
    const state = await page.evaluate(() => {
      const a = (window as any).agentCity;
      return { truth: a.truth, presentation: a.presentation };
    });
    const agents = Object.values(state.truth.agents) as any[];
    const actor = agents.find(
      (a) => a.id.includes(accepted.id) && a.profile === "city-coder",
    );
    if (actor && !followed) {
      const buttons = page.locator("#roster button");
      for (let i = 0; i < (await buttons.count()); i++) {
        const t = await buttons.nth(i).getAttribute("data-instance");
        if (t === actor.id) {
          await buttons.nth(i).click();
          await page.locator("#follow").click();
          followed = true;
          break;
        }
      }
    }
    if (actor) {
      const walker = state.presentation.walkers[actor.id];
      if (walker?.scene) scenes.add(walker.scene);
    }
    const status = await page.evaluate(async () => {
      const s = await (await fetch("/control/status")).json();
      return s.jobs;
    });
    job = status.find((j: any) => j.id === accepted.id);
    if (job && ["completed", "failed"].includes(job.status)) break;
    await page.waitForTimeout(400);
  }
  if (codex && job?.status === "completed")
    await page.waitForFunction(
      (id) =>
        Object.values((window as any).agentCity.truth.agents).some(
          (a: any) =>
            a.id.includes(id) &&
            Object.values(a.operations).some(
              (o: any) =>
                o.metadata?.tool === "kujo.check" && o.status !== "active",
            ),
        ),
      accepted.id,
      { timeout: 15000 },
    );
  const detail = await page.evaluate(
    async (id) => ({
      artifact: await (await fetch("/control/artifact/" + id)).json(),
      exchanges: await (await fetch("/control/mission/" + id)).json(),
      truth: (window as any).agentCity.truth,
    }),
    accepted.id,
  );
  await page.screenshot({ path: out + "/world.png", fullPage: true });
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        id: accepted.id,
        job,
        scenes: [...scenes],
        followed,
        ...detail,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      id: accepted.id,
      status: job?.status,
      scenes: [...scenes],
      followed,
      artifact: detail.artifact,
      errors,
    }),
  );
  assert.equal(job?.status, "completed");
  assert.equal(typeof detail.artifact.draft, "string");
  if (codex) {
    assert.equal(detail.artifact.validation?.syntax, "valid");
    assert.equal(detail.artifact.codeExecuted, false);
    assert(scenes.has("mcp"));
    const ops = Object.values(detail.truth.agents)
      .filter((a: any) => a.id.includes(accepted.id))
      .flatMap((a: any) => Object.values(a.operations)) as any[];
    assert(
      ops.some(
        (o) =>
          o.metadata?.server === "kujolang-mcp" &&
          o.metadata?.tool === "get_catalog_item" &&
          o.status === "succeeded",
      ),
    );
    assert(
      ops.some(
        (o) => o.capability === "agent.handoff" && o.status === "succeeded",
      ),
    );
  }
  assert.deepEqual(errors, []);
} finally {
  clearTimeout(timer);
  await browser.close();
}
