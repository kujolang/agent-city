import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { VerifiedVideoopsAsset } from "./videoops-gates";
export interface VideoopsMediaRef extends VerifiedVideoopsAsset {
  bytes: number;
}
export function validateVideoopsMediaRefs(value: unknown): VideoopsMediaRef[] {
  if (!Array.isArray(value) || value.length > 64)
    throw Error("Bounded media manifest required");
  const paths = new Set<string>();
  let total = 0;
  for (const r of value) {
    if (
      !r ||
      Object.keys(r).some(
        (k) => !["path", "sha256", "bytes", "rightsEvidence"].includes(k),
      ) ||
      typeof r.path !== "string" ||
      r.path.length > 256 ||
      !/^assets\/(source|captured|generated|normalized|audio|fonts)\/[a-zA-Z0-9_/-][a-zA-Z0-9_./-]*\.(png|jpe?g|webp|gif|avif|svg|mp4|webm|mp3|wav|ogg|m4a|woff2?|ttf)$/.test(
        r.path,
      ) ||
      r.path
        .split("/")
        .some(
          (p: string) => !p || p === "." || p === ".." || p.startsWith("."),
        ) ||
      paths.has(r.path) ||
      !/^[a-f0-9]{64}$/.test(r.sha256) ||
      !Number.isSafeInteger(r.bytes) ||
      r.bytes < 1 ||
      r.bytes > 16777216 ||
      typeof r.rightsEvidence !== "string" ||
      !r.rightsEvidence.trim() ||
      Buffer.byteLength(r.rightsEvidence) > 1024
    )
      throw Error("Invalid acquired media reference");
    paths.add(r.path);
    total += r.bytes;
  }
  if (total > 67108864) throw Error("Media transfer budget exceeded");
  return structuredClone(value);
}
/** Only explicit acquired paths are read; no directory traversal or implicit scan. */
export async function inspectVideoopsMedia(
  root: string,
  assets: VerifiedVideoopsAsset[],
) {
  const base = await realpath(root);
  const refs = [];
  for (const asset of assets) {
    // Validate ownership/path before any source filesystem read.
    validateVideoopsMediaRefs([{ ...asset, bytes: 1 }]);
    const file = resolve(base, asset.path);
    const info = await lstat(file);
    if (!info.isFile() || (await realpath(file)) !== file)
      throw Error("Acquired media path redirected");
    refs.push({ ...asset, bytes: info.size });
  }
  const valid = validateVideoopsMediaRefs(refs);
  for (const ref of valid) await verifiedBytes(base, ref);
  return valid;
}
async function verifiedBytes(root: string, ref: VideoopsMediaRef) {
  const file = resolve(root, ref.path);
  const info = await lstat(file);
  if (
    !info.isFile() ||
    info.size !== ref.bytes ||
    (await realpath(file)) !== file
  )
    throw Error("Acquired media changed");
  const bytes = await readFile(file);
  if (
    bytes.length !== ref.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== ref.sha256
  )
    throw Error("Acquired media checksum changed");
  return bytes;
}
/** Destination must be invocation-owned. Creates its assets root exclusively. */
export async function copyVideoopsMedia(
  source: string,
  destination: string,
  refs: VideoopsMediaRef[],
) {
  const valid = validateVideoopsMediaRefs(refs);
  if (!valid.length) return;
  const base = await realpath(source);
  const target = await realpath(destination);
  await mkdir(resolve(target, "assets"), { mode: 0o700 });
  for (const ref of valid) {
    const bytes = await verifiedBytes(base, ref);
    const file = resolve(target, ref.path);
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    if ((await realpath(dirname(file))) !== dirname(file))
      throw Error("Media destination redirected");
    await writeFile(file, bytes, { mode: 0o600, flag: "wx" });
  }
}
