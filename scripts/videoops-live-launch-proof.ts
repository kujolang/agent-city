/** Real Mission Command launch; never retries source work or records human approval. */
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.CITY_APP_URL || "http://127.0.0.1:27178";
const output =
  process.env.CITY_PROOF_OUTPUT || "evidence/videoops-combined-live";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(origin);
  await page.getByText("VideoOps production", { exact: true }).click();
  const prompt =
    "Create a six-second silent 640x360, 30fps Agent City title card. Use original flat pixel-style vector buildings on a black/navy background with bright blue borders. Show AGENT CITY immediately, then REAL AGENTS. VISIBLE WORK. at two seconds. Keep all text readable and on screen through the end. Use only generic monospace fonts and original inline vector/CSS artwork. No external assets, audio, generation, web requests or claims of live agent activity. This is a production-workflow acceptance video, not a replacement for the previously approved pixel video.";
  await page.getByLabel("Video production request").fill(prompt);
  await page
    .getByLabel(
      "Allow this task to render in the configured isolated Workcell.",
    )
    .check();
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/control/missions") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Start video production", exact: true })
    .click();
  const reply = await response;
  const result = await reply.json();
  assert.equal(reply.status(), 202, JSON.stringify(result));
  await writeFile(
    output + "/launch.json",
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        origin,
        prompt,
        result,
        scope:
          "Actual browser submission to real Codex-backed SDK stages and isolated Workcell. No approval asserted.",
      },
      null,
      2,
    ) + "\n",
  );
  await page.screenshot({ path: output + "/submitted.png" });
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
