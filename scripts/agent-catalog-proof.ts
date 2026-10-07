import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { mkdir, writeFile } from "node:fs/promises";
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
  await page.getByText("Agent profiles / teams", { exact: true }).click();
  const panel = page
    .locator("details")
    .filter({ has: page.getByText("Agent profiles / teams", { exact: true }) });
  await panel
    .getByText("85 imported profiles. Execution adapters are not connected.", {
      exact: true,
    })
    .waitFor();
  const data = await page.evaluate(async () =>
    (await fetch("/control/agents")).json(),
  );
  assert.equal(data.profiles.length, 85);
  assert.equal(new Set(data.profiles.map((p: any) => p.id)).size, 85);
  assert(
    data.profiles.every(
      (p: any) => p.executionStatus === "NOT_CONNECTED" && !("contracts" in p),
    ),
  );
  const teams = await panel.locator("select option").allTextContents();
  assert.equal(teams.length, 5);
  await panel.locator("select").selectOption("chain-of-command");
  await panel
    .getByRole("button", { name: "Code Reviewer · NOT_CONNECTED", exact: true })
    .click();
  await panel
    .locator("pre")
    .getByText("chain.code-reviewer", { exact: false })
    .waitFor();
  await mkdir("evidence/agent-catalog", { recursive: true });
  await panel.screenshot({ path: "evidence/agent-catalog/catalog.png" });
  const evidence = {
    scope:
      "Real Kujo agent registry import and read-only browser catalog; no profile execution",
    profiles: data.profiles.length,
    teams: teams.slice(1),
    source: data.source,
    contractTextBroadcast: false,
    allExecutionBindings: "NOT_CONNECTED",
    browser: browser.version(),
  };
  await writeFile(
    "evidence/agent-catalog/proof.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
