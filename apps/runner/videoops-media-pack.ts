import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  copyVideoopsMedia,
  inspectVideoopsMedia,
  validateVideoopsMediaRefs,
  type VideoopsMediaRef,
} from "./videoops-media-transfer";
import type { VerifiedVideoopsAsset } from "./videoops-gates";

export interface VideoopsPackAsset extends VideoopsMediaRef {
  id: string;
  description: string;
  sourceType?: "product-capture" | "font" | "approved-local";
  durationSeconds?: number;
  audioRole?: "voice" | "music" | "sfx";
}
export interface VideoopsMediaPack {
  schema: "agent-city.videoops-media-pack.v1";
  name: string;
  styleIntake: string;
  assets: VideoopsPackAsset[];
  licenses: { path: string; sha256: string; bytes: number }[];
}
const hash = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && !!v.trim() && Buffer.byteLength(v) <= max;
const ref = ({ path, sha256, bytes, rightsEvidence }: VideoopsPackAsset) => ({
  path,
  sha256,
  bytes,
  rightsEvidence,
});
function validate(value: unknown): VideoopsMediaPack {
  const m = value as VideoopsMediaPack;
  if (
    !m ||
    m.schema !== "agent-city.videoops-media-pack.v1" ||
    !text(m.name, 120) ||
    !text(m.styleIntake, 8192) ||
    !Array.isArray(m.assets) ||
    !m.assets.length ||
    !Array.isArray(m.licenses) ||
    m.licenses.length > 16 ||
    Object.keys(m).some(
      (k) =>
        !["schema", "name", "styleIntake", "assets", "licenses"].includes(k),
    )
  )
    throw Error("Invalid media pack");
  const ids = new Set<string>();
  for (const a of m.assets) {
    if (
      !a ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(a.id) ||
      ids.has(a.id) ||
      !text(a.description, 1024) ||
      Object.keys(a).some(
        (k) =>
          ![
            "id",
            "path",
            "sha256",
            "bytes",
            "rightsEvidence",
            "description",
            "sourceType",
            "durationSeconds",
            "audioRole",
          ].includes(k),
      ) ||
      (a.sourceType !== undefined &&
        !["product-capture", "font", "approved-local"].includes(
          a.sourceType,
        )) ||
      (a.audioRole !== undefined &&
        !["voice", "music", "sfx"].includes(a.audioRole)) ||
      (/\.(mp3|wav|ogg|m4a)$/.test(a.path) &&
        (a.audioRole === undefined || a.durationSeconds === undefined)) ||
      (a.audioRole !== undefined && !/\.(mp3|wav|ogg|m4a)$/.test(a.path)) ||
      (a.durationSeconds !== undefined &&
        (!Number.isFinite(a.durationSeconds) ||
          a.durationSeconds <= 0 ||
          a.durationSeconds > 600))
    )
      throw Error("Invalid media pack asset");
    ids.add(a.id);
  }
  validateVideoopsMediaRefs(m.assets.map(ref));
  const paths = new Set<string>();
  for (const l of m.licenses) {
    if (
      !l ||
      Object.keys(l).some((k) => !["path", "sha256", "bytes"].includes(k)) ||
      !/^licenses\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,100}\.txt$/.test(l.path) ||
      paths.has(l.path) ||
      !/^[a-f0-9]{64}$/.test(l.sha256) ||
      !Number.isSafeInteger(l.bytes) ||
      l.bytes < 1 ||
      l.bytes > 32768
    )
      throw Error("Invalid media license");
    paths.add(l.path);
  }
  return structuredClone(m);
}
// Canonical key order makes identity independent of JSON object insertion order.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((v as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(v);
}
async function licenseBytes(
  root: string,
  l: VideoopsMediaPack["licenses"][number],
) {
  const file = resolve(root, l.path),
    st = await lstat(file);
  if (!st.isFile() || st.size !== l.bytes || (await realpath(file)) !== file)
    throw Error("Media license redirected or changed");
  const b = await readFile(file);
  if (b.length !== l.bytes || hash(b) !== l.sha256)
    throw Error("Media license checksum changed");
  return b;
}
async function verify(root: string, m: VideoopsMediaPack) {
  const found = await inspectVideoopsMedia(root, m.assets.map(ref));
  if (found.some((r, i) => r.bytes !== m.assets[i].bytes))
    throw Error("Media pack size changed");
  for (const l of m.licenses) await licenseBytes(root, l);
}
async function pack(registryRoot: string, packId: string) {
  if (!/^pack-[a-f0-9]{64}$/.test(packId))
    throw Error("Invalid media pack identity");
  const base = await realpath(registryRoot),
    dir = resolve(base, packId);
  if (!(await lstat(dir)).isDirectory() || (await realpath(dir)) !== dir)
    throw Error("Media pack redirected");
  const file = resolve(dir, "pack.json"),
    st = await lstat(file);
  if (!st.isFile() || st.size > 196608 || (await realpath(file)) !== file)
    throw Error("Invalid media pack manifest");
  const manifest = validate(JSON.parse(await readFile(file, "utf8")));
  if ("pack-" + hash(canonical(manifest)) !== packId)
    throw Error("Media pack manifest checksum changed");
  await verify(dir, manifest);
  return { dir, manifest };
}
/** Operator-only local registration. Browser/model input must never supply sourceRoot. */
export async function registerVideoopsMediaPack(options: {
  sourceRoot: string;
  manifest: unknown;
  registryRoot: string;
}) {
  const manifest = validate(options.manifest),
    source = await realpath(options.sourceRoot);
  await verify(source, manifest);
  await mkdir(options.registryRoot, { recursive: true, mode: 0o700 });
  const registry = await realpath(options.registryRoot),
    packId = "pack-" + hash(canonical(manifest));
  try {
    await pack(registry, packId);
    return { packId, manifest };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const staging = await mkdtemp(resolve(registry, ".pack-"));
  try {
    await copyVideoopsMedia(source, staging, manifest.assets.map(ref));
    for (const l of manifest.licenses) {
      const path = resolve(staging, l.path);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(path, await licenseBytes(source, l), {
        flag: "wx",
        mode: 0o600,
      });
    }
    await writeFile(resolve(staging, "pack.json"), canonical(manifest) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
    await rename(staging, resolve(registry, packId));
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  await pack(registry, packId);
  return { packId, manifest };
}
export async function stageVideoopsMediaPack(options: {
  registryRoot: string;
  packId: string;
  workspace: string;
}) {
  const { dir, manifest } = await pack(options.registryRoot, options.packId);
  await copyVideoopsMedia(dir, options.workspace, manifest.assets.map(ref));
  const target = await realpath(options.workspace);
  // Preserve font/media license texts alongside source bytes, outside media inventory.
  await mkdir(resolve(target, "media-pack"), { mode: 0o700 });
  for (const l of manifest.licenses)
    await writeFile(
      resolve(target, "media-pack", l.path.split("/")[1]),
      await licenseBytes(dir, l),
      { flag: "wx", mode: 0o600 },
    );
  await writeFile(
    resolve(target, "media-pack/manifest.json"),
    canonical(manifest) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  const verifiedAssets: Record<string, VerifiedVideoopsAsset> = {};
  for (const a of manifest.assets)
    verifiedAssets[a.id] = {
      path: a.path,
      sha256: a.sha256,
      rightsEvidence: a.rightsEvidence,
    };
  return {
    verifiedAssets,
    descriptions: manifest.assets.map((a) => ({
      id: a.id,
      description: a.description,
      sourceType: a.sourceType,
      durationSeconds: a.durationSeconds,
      audioRole: a.audioRole,
    })),
    styleIntake: manifest.styleIntake,
    manifest,
  };
}
/** Fail closed: tampered packs cannot be advertised as usable. */
export async function listVideoopsMediaPacks(registryRoot: string) {
  let names: string[];
  try {
    names = await readdir(registryRoot);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const result = [];
  for (const id of names
    .filter((n) => /^pack-[a-f0-9]{64}$/.test(n))
    .sort()
    .slice(0, 64)) {
    try {
      const { manifest } = await pack(registryRoot, id);
      result.push({
        id,
        name: manifest.name,
        styleIntake: manifest.styleIntake,
      });
    } catch {
      /* A corrupt local pack is unavailable; selecting its ID still fails explicitly. */
    }
  }
  return result;
}

/** Validate one exact registered pack without mutating source or mission state. */
export async function inspectVideoopsMediaPack(options: {
  registryRoot: string;
  packId: string;
}): Promise<VideoopsMediaPack> {
  return (await pack(options.registryRoot, options.packId)).manifest;
}
