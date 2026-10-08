/** Controlled browser snapshots: no source task or provider is invoked. */
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { initialTruth, reduceTruth } from "../packages/world-core";
import type { CityEvent } from "../packages/protocol";
import { localChromiumPath } from "../apps/runner/browser-path";
const retained = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as CityEvent);
const started = retained.find(
  (e) =>
    e.type === "operation.started" && e.operation.capability === "agent.run",
)!;
assert(started && "instance" in started);
const source = "reload-mission-follow-fixture";
const event = {
  ...started,
  source,
  instance: source + ":run:worker",
  run: { namespace: source, id: "run" },
} as typeof started;
const active = reduceTruth(initialTruth(), event);
const completed = reduceTruth(active, {
  ...event,
  eventId: "b".repeat(64),
  order: event.order + 1,
  type: "operation.finished",
  operation: { ...event.operation, outcome: "succeeded" },
});
const ambiguous = reduceTruth(active, {
  ...event,
  eventId: "c".repeat(64),
  order: event.order + 1,
  instance: source + ":run:second",
});
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18893, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: await localChromiumPath(),
});
const results = [];
try {
  for (const [name, truth, expected] of [
    ["active", active, event.instance],
    ["completed", completed, null],
    ["ambiguous", ambiguous, null],
  ] as const) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const writes: string[] = [],
      errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      `window.EventSource=class extends EventTarget {readyState=1;close(){}}`,
    );
    await page.route("**/api/**", (route) =>
      route.fulfill({
        json: {
          epoch: "reload-fixture",
          truth,
          order: truth.order,
          recent: [],
          cursor: "reload-fixture:1",
          sourceHealth: { status: "LIVE" },
        },
      }),
    );
    await page.route("**/control/**", (route) => {
      if (route.request().method() !== "GET")
        writes.push(route.request().method());
      return route.fulfill({
        json: {
          configured: true,
          storageHealthy: true,
          busy: true,
          jobs: [{ id: "mission-follow-fixture", status: "running" }],
          token: "fixture",
          model: "controlled",
          profiles: [],
          exchanges: [],
        },
      });
    });
    await page.goto("http://127.0.0.1:18893/?renderer=off");
    await page.waitForFunction(() =>
      Boolean((window as any).agentCity?.truth?.order),
    );
    await page.waitForTimeout(250);
    // A real page reload must restore the exact active instance from the snapshot.
    await page.reload();
    await page.waitForFunction(() =>
      Boolean((window as any).agentCity?.truth?.order),
    );
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      follow: (window as any).agentCity.follow,
      truth: (window as any).agentCity.truth,
    }));
    assert.equal(state.follow, expected, name);
    assert.deepEqual(state.truth, truth);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    results.push({
      name,
      follow: state.follow,
      unchangedTruth: true,
      sourceWrites: 0,
    });
    await page.close();
  }
  await mkdir("evidence/follow-reload", { recursive: true });
  await writeFile(
    "evidence/follow-reload/proof.json",
    JSON.stringify(
      {
        scope: "Controlled reload snapshots; DOM fallback, no source execution",
        browser: browser.version(),
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  await server.close();
}
