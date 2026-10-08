/** Controlled onboarding UI faults; never substitutes for real provider/task proof. */
import { chromium, type Browser } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { initialTruth } from "../packages/world-core/index";
import { localChromiumPath } from "../apps/runner/browser-path";
const out = "evidence/provider-setup-faults";
await mkdir(out, { recursive: true });
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18890, strictPort: true },
});
let browser: Browser | undefined;
const deadline = setTimeout(() => {
  void browser?.close();
  void server.close();
  process.exitCode = 1;
}, 60000);
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [],
    writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let discovery: "unavailable" | "empty" | "models" = "unavailable",
    configured = false;
  await page.addInitScript(
    `window.EventSource=class extends EventTarget {static CLOSED=2;readyState=1;close(){this.readyState=2;}};`,
  );
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json: {
        epoch: "setup-fixture",
        truth: initialTruth(),
        order: 0,
        recent: [],
        cursor: "setup-fixture:0",
        sourceHealth: { status: "UNKNOWN" },
      },
    }),
  );
  await page.route("**/control/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() !== "GET") {
      writes.push(path);
      assert.equal(
        req.headers()["x-city-command-token"],
        "controlled-onboarding",
      );
    }
    if (path === "/control/status")
      return route.fulfill({
        json: {
          configured,
          storageHealthy: true,
          busy: false,
          jobs: [],
          token: "controlled-onboarding",
          endpoint: "",
          model: configured ? "controlled-model" : "",
          maxOutputTokens: 2048,
        },
      });
    if (path === "/control/agents")
      return route.fulfill({ json: { imported: false, profiles: [] } });
    if (path === "/control/discover-ollama")
      return route.fulfill({
        json:
          discovery === "unavailable"
            ? {
                available: false,
                models: [],
                message:
                  "Local Ollama was not reachable or returned invalid metadata. Start Ollama, then detect again. No provider was selected.",
              }
            : {
                available: true,
                models:
                  discovery === "empty"
                    ? []
                    : ["controlled-model", "<img src=x onerror=alert(1)>"],
              },
      });
    if (path === "/control/check-model")
      return route.fulfill({
        status: 401,
        json: { error: "Provider returned HTTP 401" },
      });
    if (path === "/control/config") {
      configured = true;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      status: 404,
      json: { error: "No controlled endpoint" },
    });
  });
  await page.goto("http://127.0.0.1:18890/?renderer=off");
  await page.waitForFunction(() =>
    document
      .querySelector("#mission-status")
      ?.textContent?.includes("MODEL NOT CONFIGURED"),
  );
  await page.getByText("Model connection", { exact: true }).click();
  const guide = page.locator("#provider-setup");
  assert(await guide.evaluate((e: HTMLDetailsElement) => e.open));
  assert.equal(await guide.getByRole("link").count(), 3);
  const start = page.getByRole("button", {
    name: "Start mission",
    exact: true,
  });
  assert(await start.isDisabled());
  const endpoint = page.locator("input[name=endpoint]"),
    model = page.locator("input[name=model]");
  await endpoint.fill("https://provider.example/v1/chat/completions");
  await model.fill("draft-model");
  const detect = page.getByRole("button", {
    name: "Detect local Ollama",
    exact: true,
  });
  await detect.click();
  await page.waitForFunction(() =>
    document
      .querySelector("#model-check-status")
      ?.textContent?.includes("Start Ollama"),
  );
  assert.equal(
    await endpoint.inputValue(),
    "https://provider.example/v1/chat/completions",
  );
  assert.equal(await model.inputValue(), "draft-model");
  assert(await start.isDisabled());
  discovery = "empty";
  await detect.click();
  await page.waitForFunction(() =>
    document
      .querySelector("#model-check-status")
      ?.textContent?.includes("no installed models"),
  );
  assert(await page.locator("#local-model-label").isHidden());
  assert(await start.isDisabled());
  discovery = "models";
  await detect.click();
  await page.waitForFunction(
    () => document.querySelectorAll("#local-models option").length === 3,
  );
  assert.equal(await page.locator("#local-models img").count(), 0);
  await page.locator("#local-models").selectOption("controlled-model");
  assert.equal(
    await endpoint.inputValue(),
    "http://127.0.0.1:11434/v1/chat/completions",
  );
  assert.equal(await page.locator("input[name=apiKey]").inputValue(), "");
  assert(await start.isDisabled());
  await page
    .getByRole("button", { name: "Check model listing", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("#model-check-status")
      ?.textContent?.includes("HTTP 401"),
  );
  assert(await start.isDisabled());
  await page.setViewportSize({ width: 320, height: 740 });
  await guide.getByRole("link").first().focus();
  assert(
    await guide
      .getByRole("link")
      .first()
      .evaluate((e) => e === document.activeElement),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await guide.screenshot({ path: out + "/guide-320.png" });
  assert(!writes.includes("/control/missions"));
  assert(!configured);
  assert.deepEqual(errors, []);
  await page
    .getByRole("button", { name: "Save connection", exact: true })
    .click();
  await page.waitForFunction(
    () => !document.querySelector<HTMLDetailsElement>("#model-settings")!.open,
  );
  assert(
    await page
      .locator("#mission-form textarea[name=prompt]")
      .evaluate((e) => e === document.activeElement),
  );
  assert(configured);
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        scope:
          "Controlled Chromium DOM onboarding faults; no real provider authentication, generation, or tasks",
        browser: browser.version(),
        missingProviderPreservesDraft: true,
        emptyModelsRemainUnconfigured: true,
        listingFailureDoesNotEnableTasks: true,
        modelNamesRenderedAsText: true,
        localKeyBlank: true,
        keyboardGuide: true,
        narrowOverflow: false,
        noMissionStarted: true,
        successfulSaveCollapsesSetupAndFocusesTask: true,
        writes,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Provider setup controlled browser proof: PASS");
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server.close();
}
