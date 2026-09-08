import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

/** Opt-in real local-model proof against the extracted application's own UI. */
export async function packagedMissions(page: Page, url: string, out: string) {
  const model = "qwen2.5-coder:1.5b-instruct";
  const tags = await (await fetch("http://127.0.0.1:11434/api/tags")).json();
  assert(
    tags.models.some((m: any) => m.name === model),
    "Expected existing local model",
  );
  await page
    .locator(".mission-panel details")
    .first()
    .locator("summary")
    .click();
  await page
    .locator('#model-form [name="endpoint"]')
    .fill("http://127.0.0.1:11434/v1/chat/completions");
  await page.locator('#model-form [name="model"]').fill(model);
  await page.locator("#model-form button").click();
  await page.waitForFunction(
    () =>
      !(document.querySelector("#mission-form button") as HTMLButtonElement)
        .disabled,
  );
  const receipts = [];
  for (const kind of ["writing", "code"]) {
    await page.locator('#mission-form [name="kind"]').selectOption(kind);
    const prompt =
      kind === "writing"
        ? "Write three short sentences introducing Agent City using these facts only: it is local; it visualizes observed agent activity; truth is separate from animation. Do not invent features."
        : "Return only an ES module with named export function sum(numbers). Sum an array of finite numbers. Return 0 for an empty array. Throw TypeError for a non-number element. No markdown, examples, or CommonJS.";
    await page.locator('#mission-form [name="prompt"]').fill(prompt);
    await page
      .locator('#mission-form [name="useLocalDocs"]')
      .setChecked(kind === "writing");
    await page
      .locator('#mission-form [name="useMcpDocs"]')
      .setChecked(kind === "writing");
    if (kind === "code") {
      await page.locator("#mission-form details summary").click();
      await page.locator('[name="functionContract"]').fill(
        JSON.stringify({
          exportName: "sum",
          cases: [
            { name: "empty", args: [[]], equals: 0 },
            { name: "addition", args: [[2, 3, -1]], equals: 4 },
            { name: "reject text", args: [[1, "2"]], throws: "TypeError" },
          ],
        }),
      );
    }
    const accepted = page.waitForResponse(
      (r) =>
        r.url().endsWith("/control/missions") &&
        r.request().method() === "POST",
    );
    await page.locator("#mission-form button").click();
    const response = await accepted;
    assert.equal(response.status(), 202);
    const { id } = await response.json();
    const deadline = Date.now() + 210000;
    let terminal: any,
      selected = false;
    const track: any[] = [];
    while (Date.now() < deadline) {
      const s = await (await fetch(url + "/control/status")).json();
      const job = s.jobs.find((j: any) => j.id === id);
      const a = await page.evaluate((id) => {
        const city = (window as any).agentCity;
        const agent: any = Object.values(city.truth.agents).find(
          (a: any) =>
            a.id.includes(id) &&
            ["city-writer", "city-coder"].includes(a.profile),
        );
        return agent
          ? {
              id: agent.id,
              status: agent.status,
              walker: city.presentation.walkers[agent.id],
            }
          : null;
      }, id);
      if (a) {
        if (!selected) {
          await page
            .locator("#roster button")
            .filter({ hasText: kind === "writing" ? "WRITER" : "CODER" })
            .first()
            .click();
          await page.locator("#follow").click();
          selected = true;
        }
        const key = a.walker?.scene + ":" + a.walker?.phase + ":" + a.status;
        if (!track.some((t) => t.key === key)) track.push({ key, ...a });
      }
      if (["completed", "failed"].includes(job?.status)) {
        terminal = job;
        if (
          kind === "code" ||
          track.some(
            (t) => t.walker?.scene === "mcp" && t.walker?.phase === "read",
          )
        )
          break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    assert(
      terminal,
      "Mission did not reach terminal state within bounded proof",
    );
    const exchanges = await (
      await fetch(url + "/control/exchanges/" + id)
    ).json();
    const artifact = await (
      await fetch(url + "/control/artifact/" + id)
    ).json();
    const truth = await page.evaluate(() => (window as any).agentCity.truth);
    const receipt = { kind, job: terminal, track, exchanges, artifact, truth };
    await writeFile(
      resolve(out, kind + ".json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    receipts.push({ kind, id, status: terminal.status });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(out, kind + ".png") });
    assert.equal(terminal.status, "completed");
    assert.equal(
      exchanges.records.length,
      2,
      "Actual worker and reviewer responses required",
    );
    if (kind === "writing")
      assert(
        track.some(
          (t) => t.walker?.scene === "mcp" && t.walker?.phase === "read",
        ),
        "Evidence-backed MCP visual visit required",
      );
  }
  return { model, receipts };
}
