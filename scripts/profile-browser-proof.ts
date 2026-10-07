import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const proof = JSON.parse(
  await readFile("evidence/profile-missions/real/proof.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.CITY_BROWSER_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity?.truth.agents || {}).some(
        (a: any) => a.id.includes(id),
      ),
    proof.mission,
  );
  await page.getByText("Custom author / reviewer", { exact: true }).click();
  await page
    .getByRole("button", { name: "Refresh imported profiles", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll("select[name=authorProfile] option").length ===
      86,
  );
  await page
    .locator("select[name=authorProfile]")
    .selectOption(proof.profiles.author.id);
  await page
    .locator("select[name=reviewerProfile]")
    .selectOption(proof.profiles.reviewer.id);
  assert(
    await page
      .locator(
        'select[name=authorProfile] option[value="kujolang/kujo-agents:webops.webops-reporter"]',
      )
      .evaluate((option) => (option as HTMLOptionElement).disabled),
  );
  const agents = (await page.evaluate(
    (id) =>
      Object.values((window as any).agentCity.truth.agents).filter((a: any) =>
        a.id.includes(id),
      ),
    proof.mission,
  )) as any[];
  assert(agents.some((a) => a.profile === proof.profiles.author.id));
  assert(agents.some((a) => a.profile === proof.profiles.reviewer.id));
  await page
    .locator("#roster button")
    .filter({ hasText: "documentation-writer" })
    .first()
    .click();
  await page.locator("#follow").click();
  await page.screenshot({
    path: "evidence/profile-missions/real/browser.png",
    fullPage: true,
  });
  const observed = await page.evaluate(() => ({
    scene: (window as any).agentCity.scene,
    selected: (window as any).agentCity.selected,
    rendererReady: (window as any).agentCity.rendererReady,
  }));
  const evidence = {
    scope:
      "Retained real observations delivered through Watchdog/gateway to browser; no replay-generated source work",
    mission: proof.mission,
    agents: agents.map((a) => ({
      id: a.id,
      profile: a.profile,
      status: a.status,
      completeness: a.completeness,
    })),
    unsupportedProfileDisabled: true,
    selectedProfiles: {
      author: await page.locator("select[name=authorProfile]").inputValue(),
      reviewer: await page.locator("select[name=reviewerProfile]").inputValue(),
    },
    ...observed,
    browser: browser.version(),
  };
  await writeFile(
    "evidence/profile-missions/real/browser.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
