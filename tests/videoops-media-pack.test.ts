import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  registerVideoopsMediaPack,
  stageVideoopsMediaPack,
  listVideoopsMediaPacks,
  inspectVideoopsMediaPack,
} from "../apps/runner/videoops-media-pack";
const builtin = resolve("assets/videoops/pixel-v2");
async function fixture() {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "city-pack-")));
  const manifest = JSON.parse(
    await readFile(resolve(builtin, "pack.json"), "utf8"),
  );
  const registryRoot = resolve(root, "registry"),
    workspace = resolve(root, "mission");
  await mkdir(workspace);
  return { root, manifest, registryRoot, workspace };
}
test("pixel preset pins actual product imagery and font, retains license, and registers idempotently without audio", async () => {
  const f = await fixture();
  try {
    const a = await registerVideoopsMediaPack({ ...f, sourceRoot: builtin });
    expect(await inspectVideoopsMediaPack({ ...f, packId: a.packId })).toEqual(
      a.manifest,
    );
    const b = await registerVideoopsMediaPack({ ...f, sourceRoot: builtin });
    expect(a.packId).toBe(b.packId);
    const result = await stageVideoopsMediaPack({ ...f, packId: a.packId });
    expect(Object.keys(result.verifiedAssets)).toEqual([
      "pixel-city",
      "pixel-library",
      "pixel-workshop",
      "pixel-font",
    ]);
    expect(
      result.manifest.assets.some((a) => /\.(mp3|wav)$/.test(a.path)),
    ).toBe(false);
    expect(
      await readFile(resolve(f.workspace, "assets/source/city.png")),
    ).toEqual(await readFile(resolve(builtin, "assets/source/city.png")));
    expect(
      await readFile(resolve(f.workspace, "media-pack/OFL.txt"), "utf8"),
    ).toContain("SIL OPEN FONT LICENSE");
    expect(await listVideoopsMediaPacks(f.registryRoot)).toEqual([
      {
        id: a.packId,
        name: a.manifest.name,
        styleIntake: a.manifest.styleIntake,
      },
    ]);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("tampered acquired bytes and manifest metadata fail before staging and are not advertised", async () => {
  const f = await fixture();
  try {
    const a = await registerVideoopsMediaPack({ ...f, sourceRoot: builtin });
    const file = resolve(f.registryRoot, a.packId, "assets/source/city.png"),
      original = await readFile(file);
    await writeFile(file, Buffer.alloc(original.length));
    await expect(
      stageVideoopsMediaPack({ ...f, packId: a.packId }),
    ).rejects.toThrow("checksum");
    expect(await listVideoopsMediaPacks(f.registryRoot)).toEqual([]);
    await writeFile(file, original);
    await writeFile(
      resolve(f.registryRoot, a.packId, "pack.json"),
      JSON.stringify({
        ...f.manifest,
        styleIntake: "Forged creative instruction",
      }),
    );
    await expect(
      stageVideoopsMediaPack({ ...f, packId: a.packId }),
    ).rejects.toThrow("manifest checksum");
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("traversal, oversized media, and symlinked files are rejected", async () => {
  const f = await fixture();
  try {
    for (const change of [
      { path: "assets/source/../../outside.png" },
      { bytes: 16777217 },
      { rightsEvidence: "" },
    ]) {
      const m = structuredClone(f.manifest);
      Object.assign(m.assets[0], change);
      await expect(
        registerVideoopsMediaPack({ ...f, sourceRoot: builtin, manifest: m }),
      ).rejects.toThrow();
    }
    const a = await registerVideoopsMediaPack({ ...f, sourceRoot: builtin });
    const file = resolve(f.registryRoot, a.packId, "assets/source/city.png");
    await rm(file);
    await symlink(resolve(builtin, "assets/source/city.png"), file);
    await expect(
      stageVideoopsMediaPack({ ...f, packId: a.packId }),
    ).rejects.toThrow("redirected");
    await expect(
      stageVideoopsMediaPack({ ...f, packId: "../escape" }),
    ).rejects.toThrow("identity");
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test("license tampering and destination overwrite fail closed", async () => {
  const f = await fixture();
  try {
    const a = await registerVideoopsMediaPack({ ...f, sourceRoot: builtin });
    await mkdir(resolve(f.workspace, "assets"));
    await expect(
      stageVideoopsMediaPack({ ...f, packId: a.packId }),
    ).rejects.toThrow();
    const file = resolve(f.registryRoot, a.packId, "licenses/OFL.txt"),
      b = await readFile(file);
    await writeFile(file, Buffer.alloc(b.length));
    await expect(
      stageVideoopsMediaPack({ ...f, packId: a.packId }),
    ).rejects.toThrow("license checksum");
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("audio assets require explicit role and finite declared duration, never description inference", async () => {
  const f = await fixture();
  try {
    for (const change of [
      {
        path: "assets/audio/music.wav",
        description: "This says voice but carries no role",
        durationSeconds: 6,
      },
      { path: "assets/audio/music.wav", audioRole: "music" },
      {
        path: "assets/audio/music.wav",
        audioRole: "other",
        durationSeconds: 6,
      },
      {
        path: "assets/audio/music.wav",
        audioRole: "music",
        durationSeconds: 0,
      },
      { audioRole: "music", durationSeconds: 6 },
    ]) {
      const m = structuredClone(f.manifest);
      Object.assign(m.assets[0], change);
      await expect(
        registerVideoopsMediaPack({ ...f, sourceRoot: builtin, manifest: m }),
      ).rejects.toThrow("Invalid media pack asset");
    }
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
