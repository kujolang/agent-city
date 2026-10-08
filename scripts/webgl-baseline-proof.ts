import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
const headless = process.env.CITY_BROWSER_HEADED !== "1";
const root = resolve(import.meta.dirname, "..");
const label = process.env.CITY_BASELINE_LABEL || "current";
assert(/^[a-z0-9-]+$/.test(label));
const browser = await chromium.launch({
  headless,
  executablePath: await localChromiumPath(),
});
const deadline = setTimeout(() => {
  void browser.close();
}, 60000);
try {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const measured = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 240;
    canvas.style.width = "768px";
    canvas.style.height = "720px";
    document.body.append(canvas);
    const gl = canvas.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const info = {
      renderer: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL || gl.RENDERER),
      vendor: gl.getParameter(ext?.UNMASKED_VENDOR_WEBGL || gl.VENDOR),
    };
    const cases = [];
    for (const draw of [false, true]) {
      let prev = 0;
      const times = [];
      for (let i = -10; i < 60; i++) {
        const now = await new Promise<number>((r) => requestAnimationFrame(r));
        if (i >= 0) times.push(now - prev);
        prev = now;
        if (draw) {
          gl.clearColor(0.1, 0.2, 0.3, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
      times.sort((a, b) => a - b);
      cases.push({ draw, p50: times[30], p95: times[57] });
    }
    return { info, cases };
  });
  const report = {
    scope:
      "Bounded minimal WebGL clear versus idle canvas, no Pixi or source execution; not product certification",
    at: new Date().toISOString(),
    sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    browser: browser.version(),
    headless,
    framesPerCase: 60,
    ...measured,
  };
  await mkdir(resolve(root, "evidence/performance-current"), {
    recursive: true,
  });
  await writeFile(
    resolve(root, "evidence/performance-current/webgl-" + label + ".json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  clearTimeout(deadline);
  await browser.close();
}
