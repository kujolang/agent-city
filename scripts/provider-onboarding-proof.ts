import { localChromiumPath } from "../apps/runner/browser-path";
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
  });
  await page.goto(process.env.CITY_BROWSER_URL || "http://127.0.0.1:5178");
  await page.getByText("Model connection", { exact: true }).click();
  await page.waitForFunction(
    () =>
      !document
        .querySelector("#mission-status")
        ?.textContent?.includes("Checking"),
  );
  const auth = await page.evaluate(
    async () =>
      (
        await fetch("/control/discover-ollama", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
  );
  assert.equal(auth, 403);
  await page
    .getByRole("button", { name: "Detect local Ollama", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      !document
        .querySelector("#model-check-status")
        ?.textContent?.includes("Checking"),
  );
  const detection = await page.locator("#model-check-status").innerText();
  const options = await page.locator("#local-models option").allTextContents();
  let check = "Not run: no installed local model detected";
  if (options.length > 1) {
    await page.locator("#local-models").selectOption({ label: options[1] });
    assert.equal(await page.locator("input[name=apiKey]").inputValue(), "");
    await page
      .getByRole("button", { name: "Check model listing", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector("#model-check-status")
          ?.textContent?.includes("Checking"),
    );
    check = await page.locator("#model-check-status").innerText();
    assert.match(check, /No prompt was sent/);
  }
  await mkdir("evidence/model-onboarding", { recursive: true });
  await page.screenshot({
    path: "evidence/model-onboarding/setup.png",
    fullPage: true,
  });
  const result = {
    scope:
      "Real browser and local Ollama metadata; no generation or business execution",
    missingCommandTokenStatus: auth,
    detection,
    installedModelCount: options.length - 1,
    check,
  };
  await writeFile(
    "evidence/model-onboarding/proof.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
