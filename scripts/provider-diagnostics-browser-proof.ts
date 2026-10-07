import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const id = process.env.CITY_DIAGNOSTIC_MISSION;
if (!id) throw Error("CITY_DIAGNOSTIC_MISSION required");
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
  });
  await page.goto(process.env.CITY_BROWSER_URL || "http://127.0.0.1:5178");
  await page
    .locator("#mission-jobs button")
    .filter({ hasText: id.slice(-8) })
    .first()
    .click();
  await page
    .locator("#provider-diagnostics")
    .getByText(/finish length/)
    .waitFor();
  const text = await page.locator("#provider-diagnostics").innerText();
  assert(
    text.includes(
      "reviewer: HTTP 200; finish length; 0 content characters; requested token limit 2048",
    ),
  );
  await page.getByText("Model connection", { exact: true }).click();
  assert.equal(
    await page.locator("input[name=maxOutputTokens]").inputValue(),
    "8192",
  );
  assert(await page.locator("#local-model-label").isHidden());
  const data = await page.evaluate(
    async (id) => (await fetch("/control/diagnostics/" + id)).json(),
    id,
  );
  assert(
    data.records.every(
      (r: any) =>
        !("content" in r) && !("prompt" in r) && !("reasoning_content" in r),
    ),
  );
  await mkdir("evidence/provider-limits", { recursive: true });
  await page
    .locator(".mission-panel")
    .screenshot({ path: "evidence/provider-limits/diagnostics.png" });
  await writeFile(
    "evidence/provider-limits/browser.json",
    JSON.stringify(
      {
        mission: id,
        displayedMetadata: text,
        configuredMaxOutputTokens: 8192,
        rawProviderContentExcluded: true,
        browser: browser.version(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: actionable failure metadata displayed; explicit token limit retained",
  );
} finally {
  await browser.close();
}
