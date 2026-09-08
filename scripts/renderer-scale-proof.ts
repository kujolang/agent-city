import { chromium, type Browser } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";

const root = resolve(import.meta.dirname, "..");
const label = process.env.CITY_RENDER_PROFILE || "current";
assert(/^[a-z0-9-]+$/.test(label));
const out = resolve(root, "evidence/renderer-scale");
await mkdir(out, { recursive: true });
const base = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s))
  .find(
    (e) =>
      e.type === "operation.started" && e.operation.capability === "agent.run",
  );
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "apps/web",
    "--host",
    "127.0.0.1",
    "--port",
    "18886",
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
let browser: Browser | undefined;
// A browser/driver failure must not turn this bounded diagnostic into a soak.
const deadline = setTimeout(() => {
  console.error(
    "Renderer diagnostic exceeded 180 seconds; stopping owned test services",
  );
  if (server.exitCode === null) server.kill();
  void browser?.close();
  setTimeout(() => process.exit(1), 2000);
}, 180000);
deadline.unref();
try {
  for (let i = 0; i < 100; i++) {
    if (
      await fetch("http://127.0.0.1:18886")
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const errors: string[] = [];
  const profiles = [];
  const framesToMeasure = Number(process.env.CITY_RENDER_FRAMES || 180);
  assert(
    Number.isInteger(framesToMeasure) &&
      framesToMeasure >= 2 &&
      framesToMeasure <= 600,
  );
  for (const count of [5, 25, 100, 500]) {
    const page = await browser.newPage({
      viewport: { width: 768, height: 760 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/scale-proof", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<meta charset="utf-8"><style>body{margin:0;background:#05080f;color:white}canvas{width:768px;height:720px;image-rendering:pixelated}</style><div id="world"></div><p>SYNTHETIC renderer stress / no source execution</p>',
      }),
    );
    await page.goto("http://127.0.0.1:18886/scale-proof");
    const profile = await page.evaluate(
      async ({ count, base, root, framesToMeasure }) => {
        const rendererPath = "/@fs" + root + "/packages/renderer-pixi/index.ts",
          corePath = "/@fs" + root + "/packages/world-core/index.ts";
        const { CityRenderer } = await import(/* @vite-ignore */ rendererPath);
        const { initialTruth, reduceTruth, initialPresentation, plan } =
          await import(/* @vite-ignore */ corePath);
        let truth = initialTruth(),
          p = initialPresentation();
        for (let i = 0; i < count; i++) {
          const e = {
            ...base,
            eventId: "scale-" + i,
            instance: "scale:" + i,
            run: { namespace: "scale", id: String(i) },
            order: i + 1,
          };
          truth = reduceTruth(truth, e);
          p = plan(p, e);
        }
        const r = new CityRenderer();
        let picked = "",
          buildingPicked = "";
        await r.init(
          document.querySelector("#world"),
          (id: string) => {
            picked = id;
          },
          (id: string) => {
            buildingPicked = id;
          },
        );
        r.scene = "workshop";
        r.selected = "scale:0";
        r.follow = count > 25 ? "scale:1" : null;
        r.draw(p, truth, "REPLAY");
        const initial = [...r.actors.children];
        const identityBefore = JSON.stringify(truth);
        const raw = r.app.renderer.extract.pixels({
          target: r.app.stage,
          frame: r.app.screen,
        }).pixels;
        const digest = await crypto.subtle.digest("SHA-256", raw);
        const pixels = Array.from(new Uint8Array(digest))
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
        const times: number[] = [],
          frames: number[] = [];
        let changedFrames = 0,
          prev = performance.now();
        for (let i = 0; i < framesToMeasure; i++) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame((t) => {
              frames.push(t - prev);
              prev = t;
              resolve();
            }),
          );
          p.tick = i;
          const start = performance.now();
          r.draw(p, truth, "REPLAY");
          times.push(performance.now() - start);
          if (initial.some((v: any, j: number) => r.actors.children[j] !== v))
            changedFrames++;
        }
        const stable = r.diagnostics?.() ?? null;
        const views = [...r.actors.children];
        // Instance-specific hit callbacks still select the actual displayed ID.
        if (views.length) views[0].emit("pointertap");
        const selectionWorked = Object.hasOwn(truth.agents, picked);
        const was = r.follow;
        r.follow = null;
        r.scene = "library";
        r.draw(p, truth, "REPLAY");
        const offscreenActors = r.actors.children.length;
        r.scene = "workshop";
        r.follow = was;
        r.draw(p, truth, "REPLAY");
        r.draw({ ...p, walkers: {} }, truth, "REPLAY");
        const removedActors = r.actors.children.length;
        const after = r.diagnostics?.() ?? null;
        let transitions = null;
        if (r.diagnostics) {
          r.follow = "scale:0";
          r.draw(p, truth, "REPLAY");
          const actor = r.actorViews.get("scale:0").container;
          let retained = true;
          for (const scene of ["city", "library", "workshop"]) {
            const moved = {
              ...p,
              walkers: {
                ...p.walkers,
                "scale:0": { ...p.walkers["scale:0"], scene },
              },
            };
            r.draw(moved, truth, "REPLAY");
            retained &&=
              r.scene === scene &&
              r.actorViews.get("scale:0").container === actor;
          }
          r.follow = null;
          r.scene = "city";
          r.draw(p, truth, "REPLAY");
          const hits = [...r.buildingHits.children];
          r.draw({ ...p, tick: p.tick + 1 }, truth, "REPLAY");
          const stableHits = hits.every(
            (v: any, i: number) => v === r.buildingHits.children[i],
          );
          hits[0].emit("pointertap");
          // Exercise actual browser hit testing in Node after evaluate completes.
          (window as any).scaleBuildingPicked = () => buildingPicked;
          transitions = {
            retained,
            stableHits,
            buildingCallback: buildingPicked.length > 0,
          };
        }
        const immutable = identityBefore === JSON.stringify(truth);
        times.sort((a, b) => a - b);
        frames.sort((a, b) => a - b);
        return {
          count,
          rendered: initial.length,
          changedFrames,
          pixels,
          drawMs: {
            p50: times[Math.floor(times.length * 0.5)],
            p95: times[Math.floor(times.length * 0.95)],
          },
          frameMs: {
            p50: frames[Math.floor(frames.length * 0.5)],
            p95: frames[Math.floor(frames.length * 0.95)],
          },
          stable,
          after,
          selectionWorked,
          offscreenActors,
          removedActors,
          immutable,
          transitions,
        };
      },
      { count, base, root, framesToMeasure },
    );
    assert(profile.immutable && profile.selectionWorked);
    assert.equal(profile.rendered, count > 25 ? 2 : count);
    assert.equal(profile.offscreenActors, 0);
    assert.equal(profile.removedActors, 0);
    if (label !== "before") {
      assert.equal(
        profile.changedFrames,
        0,
        "visible actors must be reused across ticks",
      );
      assert(profile.stable?.actors <= 25);
      assert(
        profile.transitions?.retained &&
          profile.transitions?.stableHits &&
          profile.transitions?.buildingCallback,
      );
      // Dispatch facade occupies logical x=8..72, y=16..80 at 3x scale.
      await page.mouse.click(90, 100);
      assert.equal(
        await page.evaluate(() => (window as any).scaleBuildingPicked()),
        "dispatch",
      );
    }
    if (label === "aggregate")
      await page.screenshot({ path: resolve(out, `aggregate-${count}.png`) });
    profiles.push(profile);
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, label + ".json"),
    JSON.stringify(
      {
        kind: "SYNTHETIC renderer-only bounded profile; no source task or ingestion proof",
        at: new Date().toISOString(),
        browser: browser.version(),
        framesPerProfile: framesToMeasure,
        profiles,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      profiles.map((p) => ({
        count: p.count,
        rendered: p.rendered,
        changedFrames: p.changedFrames,
        drawMs: p.drawMs,
        frameMs: p.frameMs,
      })),
    ),
  );
} finally {
  if (server.exitCode === null) server.kill();
  await browser?.close();
  clearTimeout(deadline);
}
