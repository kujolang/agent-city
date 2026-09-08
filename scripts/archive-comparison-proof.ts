import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { Journal, sha } from "../apps/gateway/journal";
import { localChromiumPath } from "../apps/runner/browser-path";
import world from "../assets/compiled/world.json";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "evidence/archive-comparison");
await mkdir(out, { recursive: true });
const events = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const journal = new Journal(":memory:");
journal.append(events);
const ids = [
  ...new Set(
    events.filter((e) => e.run).map((e) => e.run.namespace + ":" + e.run.id),
  ),
] as string[];
const selected = ids.find((id) => id.includes("-eval:"))!;
const compared = ids.find((id) => id.includes("-mcp:"))!;
assert(selected && compared);
const versions = {
  protocol: "1",
  adapter: "1",
  core: "2",
  map: "1",
  coreHash: sha(await readFile("packages/world-core/index.ts", "utf8")),
  mapHash: sha(world),
};
const bundles = new Map(
  [selected, compared].map((id) => [id, journal.bundle(versions, id)]),
);
journal.close();
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "apps/web",
    "--host",
    "127.0.0.1",
    "--port",
    "18889",
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const timer = setTimeout(() => {
  server.kill();
  void browser.close();
}, 60000);
const requests: string[] = [],
  errors: string[] = [];
let corrupt = false;
try {
  for (let i = 0; i < 100; i++) {
    if (
      await fetch("http://127.0.0.1:18889")
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const page = await browser.newPage({
    viewport: { width: 1000, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    requests.push(route.request().method() + " " + route.request().url());
    const url = new URL(route.request().url());
    if (url.pathname === "/api/archive/runs")
      return route.fulfill({
        json: { runs: [{ id: selected }, { id: compared }], ledger: [] },
      });
    if (url.pathname === "/api/archive/replay") {
      const b = bundles.get(url.searchParams.get("run")!);
      return route.fulfill({
        json:
          corrupt && url.searchParams.get("run") === compared
            ? { ...b, checksum: "invalid" }
            : b,
      });
    }
    await route.abort();
  });
  await page.route("**/archive-proof", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/style.css"><main style="display:block"><section id="archive-body"></section></main><script type="module">import {archiveUI} from "/archive.ts";window.replays=0;window.lives=0;archiveUI(document.querySelector("#archive-body"),()=>window.replays++,()=>window.lives++);</script>',
    }),
  );
  await page.goto("http://127.0.0.1:18889/archive-proof");
  await page.locator("#archive-refresh").click();
  await page.waitForFunction(
    () =>
      !(document.querySelector("#archive-refresh") as HTMLButtonElement)
        .disabled && !!document.querySelector("#archive-run option"),
  );
  assert.equal(await page.locator("#archive-compare").inputValue(), "");
  await page.selectOption("#archive-run", selected);
  await page.selectOption("#archive-compare", compared);
  await page.locator("#archive-inspect").focus();
  await page.keyboard.press("Enter");
  await page.waitForSelector(".archive-run-panel:nth-child(2)");
  const output = JSON.parse(await page.locator("#archive-detail").innerText());
  for (const run of output.runs)
    assert.deepEqual(run.timeline, bundles.get(run.id)!.events);
  assert.equal(output.runs.length, 2);
  const summaries = await page
    .locator(".archive-run-panel summary")
    .allTextContents();
  assert(
    summaries.some((s) => s.includes("failed")) &&
      summaries.some((s) => s.includes("succeeded")),
  );
  assert.equal(
    await page.locator(".archive-run-panel a").count(),
    [...bundles.values()].reduce((n, b) => n + b.events.length, 0),
  );
  assert.equal(await page.evaluate(() => (window as any).replays), 0);
  await page.screenshot({
    path: resolve(out, "comparison.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await writeFile(
    resolve(out, "layout.json"),
    JSON.stringify(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("*"))
          .map((e) => ({
            tag: e.tagName,
            id: e.id,
            class: e.className,
            right: e.getBoundingClientRect().right,
            width: e.getBoundingClientRect().width,
          }))
          .filter((e) => e.right > innerWidth),
      ),
      null,
      2,
    ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: resolve(out, "comparison-320.png"),
    fullPage: true,
  });
  corrupt = true;
  await page.locator("#archive-inspect").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#archive-detail")!
      .textContent!.includes("checksum mismatch"),
  );
  assert.equal(await page.locator(".archive-run-panel").count(), 0);
  assert.equal(await page.locator("#archive-run").isEnabled(), true);
  assert.equal(await page.evaluate(() => (window as any).replays), 0);
  corrupt = false;
  await page.locator("#archive-replay").click();
  await page.waitForFunction(() => (window as any).replays === 1);
  await page.locator("#archive-live").click();
  await page.waitForFunction(() => (window as any).lives === 1);
  assert(requests.every((r) => r.startsWith("GET ")));
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        scope:
          "Read-only DOM comparison of retained real phase1 observations through current Journal exports; routed transport, no new live execution",
        selected,
        compared,
        eventCounts: [...bundles.values()].map((b) => b.events.length),
        bothTimelinesExact: true,
        failureAndPassRetained: true,
        keyboard: true,
        width320NoOverflow: true,
        checksumRejection: true,
        explicitReplayOnly: true,
        requests,
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Archive comparison proof passed");
} finally {
  clearTimeout(timer);
  await browser.close();
  if (server.exitCode === null) server.kill();
}
