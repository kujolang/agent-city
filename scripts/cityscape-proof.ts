import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "evidence/cityscape");
await mkdir(out, { recursive: true });
const cohorts = ["live-1788878052721-", "live-1788878402902-"];
const records = await Promise.all(
  cohorts.map(async (id) =>
    JSON.parse(
      await readFile(
        resolve(root, "evidence/live-missions", id, "proof.json"),
        "utf8",
      ),
    ),
  ),
);
const truth = {
  ...records[1].truth,
  agents: Object.assign({}, ...records.map((r) => r.truth.agents)),
};
const checks = Object.values(truth.agents)
  .flatMap((a: any) => Object.values(a.operations))
  .filter((o: any) => o.capability === "evaluation.run");
assert(checks.some((o: any) => o.status === "failed"));
assert(checks.some((o: any) => o.status === "succeeded"));
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "apps/web", "--port", "18887"],
  { cwd: root, stdio: "ignore" },
);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    ready = await fetch("http://127.0.0.1:18887")
      .then((r) => r.ok)
      .catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Isolated visual server failed");
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({ viewport: { width: 768, height: 760 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/visual-proof", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta charset="utf-8"><style>body{margin:0;background:#05080f;color:#a6d8a5;font:12px monospace}canvas{width:768px;height:720px;image-rendering:pixelated}p{margin:8px}</style><div id="world"></div><p>REPLAY / recorded real failed and passed attempts · renderer regression</p>',
    }),
  );
  await page.goto("http://127.0.0.1:18887/visual-proof");
  const result = await page.evaluate(
    async ({ truth, path }) => {
      const { CityRenderer } = await import(/* @vite-ignore */ path);
      const renderer = new CityRenderer();
      await renderer.init(
        document.querySelector("#world"),
        () => {},
        () => {},
      );
      const presentation = { tick: 0, seen: [], walkers: {} };
      renderer.scene = "dojo";
      renderer.draw(presentation, truth, "REPLAY");
      const { pixels, width } = renderer.app.renderer.extract.pixels({
        target: renderer.app.stage,
        frame: renderer.app.screen,
      });
      const counts: number[] = [];
      for (const [y, red, green, blue] of [
        [82, 191, 101, 92],
        [102, 166, 216, 165],
      ]) {
        let hits = 0;
        for (let yy = y; yy < y + 5; yy++)
          for (let x = 94; x < 111; x++) {
            const offset = (yy * width + x) * 4;
            if (
              pixels[offset] === red &&
              pixels[offset + 1] === green &&
              pixels[offset + 2] === blue
            )
              hits++;
          }
        counts.push(hits);
      }
      (window as any).visualRenderer = renderer;
      (window as any).visualTruth = truth;
      return {
        failedGlyphPixels: counts[0],
        passedGlyphPixels: counts[1],
      };
    },
    { truth, path: "/@fs" + resolve(root, "packages/renderer-pixi/index.ts") },
  );
  assert(
    result.failedGlyphPixels > 15,
    "Actual failed generic function checks missing from Dojo content station",
  );
  assert(
    result.passedGlyphPixels > 15,
    "Actual passed attempt missing from same Dojo station",
  );
  await page.screenshot({ path: resolve(out, "dojo-real-history.png") });
  // Negative rendering control, not source evidence: same-order empty snapshot
  // must not retain the previous real check glyphs from cached geometry.
  const resetPixels = await page.evaluate(() => {
    const r = (window as any).visualRenderer;
    r.draw(
      { tick: 1, seen: [], walkers: {} },
      { ...(window as any).visualTruth, agents: {} },
      "REPLAY",
    );
    const { pixels, width } = r.app.renderer.extract.pixels({
      target: r.app.stage,
      frame: r.app.screen,
    });
    let hits = 0;
    for (const [y, red, green, blue] of [
      [82, 191, 101, 92],
      [102, 166, 216, 165],
    ]) {
      for (let yy = y; yy < y + 5; yy++)
        for (let x = 94; x < 111; x++) {
          const offset = (yy * width + x) * 4;
          if (
            pixels[offset] === red &&
            pixels[offset + 1] === green &&
            pixels[offset + 2] === blue
          )
            hits++;
        }
    }
    return hits;
  });
  assert.equal(
    resetPixels,
    0,
    "Same-order replacement snapshot retained old check results",
  );
  for (const scene of ["city", "meeting", "dispatch", "library"]) {
    await page.evaluate((scene) => {
      const r = (window as any).visualRenderer;
      r.scene = scene;
      r.draw(
        { tick: 0, seen: [], walkers: {} },
        (window as any).visualTruth,
        "REPLAY",
      );
    }, scene);
    await page.screenshot({ path: resolve(out, scene + ".png") });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: "REPLAY of retained real model function-check outcomes; no new source execution",
        cohorts,
        browser: browser.version(),
        ...result,
        sameOrderSnapshotClearsPriorOutcomes: resetPixels === 0,
        errors,
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("Cityscape and actual failed/pass Dojo glyphs: PASS", result);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
