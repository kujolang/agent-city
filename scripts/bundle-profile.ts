/** Static production payload accounting; no inference about browser GPU allocations. */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, "dist/assets");
const files = [];
for (const name of (await readdir(dir)).sort()) {
  const data = await readFile(resolve(dir, name));
  const png = name.endsWith(".png");
  if (png)
    assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  files.push({
    name,
    bytes: data.length,
    gzipBytes: gzipSync(data, { level: 9 }).length,
    sha256: createHash("sha256").update(data).digest("hex"),
    ...(png
      ? {
          width: data.readUInt32BE(16),
          height: data.readUInt32BE(20),
          rgbaBytes: data.readUInt32BE(16) * data.readUInt32BE(20) * 4,
        }
      : {}),
  });
}
const jsGzipBytes = files
  .filter((f) => f.name.endsWith(".js"))
  .reduce((n, f) => n + f.gzipBytes, 0);
const visualGzipBytes = files
  .filter((f) => f.name.endsWith(".png"))
  .reduce((n, f) => n + f.gzipBytes, 0);
const report = {
  at: new Date().toISOString(),
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  sourceDirty:
    execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      cwd: root,
      encoding: "utf8",
    }).trim() !== "",
  scope:
    "Fresh production build. Every emitted JS chunk is counted, including lazy renderer fallbacks; upper bound rather than actual initial network transfer. PNG RGBA payload excludes browser surfaces, graphics buffers, driver overhead and mipmaps; not total texture memory or a soak.",
  jsGzipBytes,
  visualGzipBytes,
  pngDecodedRgbaBytes: files.reduce((n, f) => n + (f.rgbaBytes || 0), 0),
  targets: {
    allJsWithin500KiB: jsGzipBytes <= 500 * 1024,
    visualWithin2MiB: visualGzipBytes <= 2 * 1024 * 1024,
  },
  files,
};
await mkdir(resolve(root, "evidence/performance-current"), { recursive: true });
await writeFile(
  resolve(root, "evidence/performance-current/bundle.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    jsGzipBytes,
    visualGzipBytes,
    pngDecodedRgbaBytes: report.pngDecodedRgbaBytes,
    targets: report.targets,
  }),
);
