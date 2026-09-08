import { chromium, type Browser } from "@playwright/test";
import { createServer } from "vite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
const out = "evidence/character-strides";
await mkdir(out, { recursive: true });
const source = JSON.parse(
  await readFile("assets/source/characters.json", "utf8"),
);
const atlas = await readFile("assets/compiled/characters.png");
const server = await createServer({
  root: ".",
  server: { host: "127.0.0.1", port: 18886, strictPort: true },
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
  const page = await browser.newPage({ viewport: { width: 700, height: 920 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://127.0.0.1:18886/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><body></body>",
    }),
  );
  await page.goto("http://127.0.0.1:18886");
  const proof = await page.evaluate(async (source) => {
    document.body.innerHTML =
      "<h1>ORIGINAL KUJO / WALK CYCLE</h1><p>Asset inspection · 4 overworld frames / 4 side-view frames · no runtime activity</p>";
    document.head.innerHTML =
      "<style>body{background:#05080f;color:#9dbff5;font:12px monospace;margin:12px}h1{font-size:18px}.row{display:flex;border-top:1px solid #255fac;padding:4px;align-items:center;gap:8px}.name{width:95px}canvas{width:60px;height:72px;image-rendering:pixelated}</style>";
    const image = new Image();
    image.src = "/assets/compiled/characters.png";
    await image.decode();
    const result = [];
    for (let role = 0; role < source.palettes.length; role++) {
      const row = document.createElement("div");
      row.className = "row";
      const label = document.createElement("span");
      label.className = "name";
      label.textContent = source.palettes[role][0];
      row.append(label);
      const modes = [];
      for (let mode = 0; mode < 2; mode++) {
        const pixels = [];
        for (let frame = 0; frame < 4; frame++) {
          const c = document.createElement("canvas");
          c.width = 20;
          c.height = 24;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(
            image,
            20,
            (role * 8 + mode * 4 + frame) * 24,
            20,
            24,
            0,
            0,
            20,
            24,
          );
          pixels.push(
            Array.from(ctx.getImageData(0, 0, 20, 24).data).join(","),
          );
          row.append(c);
        }
        modes.push({ side: mode === 1, uniqueFrames: new Set(pixels).size });
      }
      document.body.append(row);
      result.push({ appearance: source.palettes[role][0], modes });
    }
    return {
      roles: result,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }, source);
  assert(
    proof.roles.every((r) => r.modes.every((m) => m.uniqueFrames === 4)),
    "Stride frames must be distinct in both views",
  );
  assert.deepEqual(errors, []);
  await page.screenshot({ path: out + "/gallery.png", fullPage: true });
  await writeFile(
    out + "/proof.json",
    JSON.stringify(
      {
        kind: "Original asset inspection; not live agent proof",
        ...proof,
        errors,
        atlasSha256: createHash("sha256").update(atlas).digest("hex"),
        pngBytes: atlas.length,
        decodedBytes: proof.width * proof.height * 4,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(proof));
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server.close();
}
