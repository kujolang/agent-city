import { createServer } from "vite";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18891, strictPort: true },
});
await mkdir("evidence/portraits", { recursive: true });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
    viewport: { width: 1000, height: 480 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/portrait-gallery", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<!doctype html><link rel="stylesheet" href="/style.css"><style>#gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;padding:16px}article{border:2px solid #347fea;padding:12px;overflow-wrap:anywhere}h2{font:12px monospace}header{font:14px monospace}</style><header>ORIGINAL KUJO APPEARANCES / NO LIVE STATUS</header><div id="gallery"></div>',
    }),
  );
  await page.goto("http://127.0.0.1:18891/portrait-gallery");
  const profiles = await page.evaluate(async () => {
    const modulePath = "/portraits.ts";
    const { portrait } = await import(/* @vite-ignore */ modulePath);
    const names = [
      "city-writer",
      "city-coder",
      "city-reviewer",
      "local-documentation-worker",
      "local-mcp-worker",
      "local-eval-invocation",
      "local-workcell-invocation",
      "unrecognized-profile",
    ];
    for (const name of names) {
      const card = document.createElement("article");
      const title = document.createElement("h2");
      title.textContent = name;
      card.append(title, portrait(name, true), portrait(name));
      document.querySelector("#gallery")!.append(card);
    }
    await Promise.all(
      Array.from(document.querySelectorAll<HTMLElement>(".agent-portrait")).map(
        (el) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = getComputedStyle(el).backgroundImage.slice(5, -2);
          }),
      ),
    );
    return names;
  });
  assert.equal(await page.locator(".agent-portrait").count(), 16);
  await page.screenshot({
    path: "evidence/portraits/gallery.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false);
  assert.deepEqual(errors, []);
  await writeFile(
    "evidence/portraits/proof.json",
    JSON.stringify(
      {
        kind: "Appearance-only DOM gallery; no execution instances or runtime claims",
        profiles,
        portraitCount: 16,
        narrowOverflow: overflow,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Original portrait projection: PASS");
} finally {
  await browser?.close();
  await server.close();
}
