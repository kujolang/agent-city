import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const url = "http://127.0.0.1:35178",
  out = process.env.CITY_WRITING_OUTPUT || "evidence/writing-repair";
const parent = "mission-7babc419-e363-44fd-9c20-a1b411751551";
await mkdir(out, { recursive: true });
const old = JSON.parse(
  await readFile("evidence/packaged-missions/writing.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const deadline = setTimeout(() => {
  void browser.close();
  process.exitCode = 1;
}, 240000);
let id = process.env.CITY_WRITING_RESUME || "";
try {
  await page.goto(url);
  if (!id) {
    await page.locator(`[data-continue="${parent}"]`).click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[name="kind"]') as HTMLSelectElement).disabled,
    );
    await page
      .locator('[name="prompt"]')
      .fill(
        "Correct the prior draft. Return exactly three short sentences in one paragraph, without headings, lists, a preface or a closing note. Use ONLY these original facts: Agent City is local. It visualizes observed agent activity. Runtime truth is separate from animation. Do not describe documentation, security, APIs, tools, deployment or any other features. Preserve the original task and produce only the requested three-sentence introduction.",
      );
    const pending = page.waitForResponse(
      (r) =>
        r.url().endsWith("/control/missions") &&
        r.request().method() === "POST",
    );
    await page.locator("#mission-form button").click();
    const response = await pending;
    assert.equal(response.status(), 202);
    id = (await response.json()).id;
    await writeFile(
      out + "/accepted.json",
      JSON.stringify({ id, parent, at: new Date().toISOString() }, null, 2) +
        "\n",
    );
  }
  assert(/^mission-[0-9a-f-]{36}$/.test(id));
  let job: any,
    followed = false;
  const track: any[] = [];
  const end = Date.now() + 210000;
  while (Date.now() < end) {
    const status = await (await fetch(url + "/control/status")).json();
    job = status.jobs.find((j: any) => j.id === id);
    const view = await page.evaluate((id) => {
      const a = (window as any).agentCity;
      if (!a) return null;
      const agent = Object.values(a.truth.agents).find(
        (v: any) => v.id.includes(id) && v.profile === "city-writer",
      ) as any;
      if (!agent) return null;
      const walker = a.presentation.walkers[agent.id];
      return {
        id: agent.id,
        status: agent.status,
        scene: walker?.scene,
        phase: walker?.phase,
        visit: walker?.visit,
        order: a.truth.order,
      };
    }, id);
    if (view) {
      if (!followed) {
        await page.getByTitle(view.id, { exact: true }).click();
        await page.locator("#follow").click();
        followed = true;
      }
      const key = view.status + ":" + view.scene + ":" + view.phase;
      if (track.at(-1)?.key !== key) {
        track.push({ key, ...view });
        await page.screenshot({
          path: out + "/visit-" + track.length + ".png",
        });
      }
    }
    if (["completed", "failed"].includes(job?.status)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(
    ["completed", "failed"].includes(job?.status),
    "Source still active: inspect accepted.json before retrying",
  );
  const artifact = await (await fetch(url + "/control/artifact/" + id)).json();
  const exchanges = await (
    await fetch(url + "/control/exchanges/" + id)
  ).json();
  const details = await (await fetch(url + "/control/mission/" + id)).json();
  const original = await (
    await fetch(url + "/control/artifact/" + parent)
  ).json();
  assert.equal(
    original.content,
    old.artifact.content,
    "Historical failed draft changed",
  );
  const sentences = artifact.content
    .trim()
    .split(/[.!?]+(?:\s|$)/u)
    .filter((s: string) => s.trim());
  const checks = {
    threeSentences: sentences.length === 3,
    sentenceCount: sentences.length,
    noHeadingsOrLists: !/^\s*(#+|[-*]|\d+[.)])\s/m.test(artifact.content),
    under80Words: artifact.content.trim().split(/\s+/).length <= 80,
  };
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents).some(
        (a: any) => a.id.includes(id) && a.status === "completed",
      ),
    id,
    { timeout: 20000 },
  );
  const truth = await page.evaluate(() => (window as any).agentCity.truth);
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        kind: "REAL current-build local-model writing continuation",
        source: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        parent,
        job,
        details,
        artifact,
        exchanges,
        track,
        truth,
        originalFailedDraftUnchanged: true,
        checks,
        semanticQuality:
          "requires review of actual output; format checks alone do not establish factual quality",
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      id,
      job,
      checks,
      content: artifact.content,
      exchanges: exchanges.records.length,
      errors,
    }),
  );
  assert.equal(job.status, "completed");
  assert.equal(details.parentMissionId, parent);
  assert.equal(exchanges.records.length, 2);
  assert.deepEqual(errors, []);
  assert(
    checks.threeSentences && checks.noHeadingsOrLists && checks.under80Words,
    "Writing format constraints failed; retained output is authoritative",
  );
} finally {
  clearTimeout(deadline);
  await browser.close();
}
