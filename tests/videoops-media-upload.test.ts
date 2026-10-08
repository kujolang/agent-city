import { test, expect } from "vitest";
import { mkdtemp, realpath, rm, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { registerUploadedVideoopsPack } from "../apps/runner/videoops-media-upload";
import { inspectVideoopsMediaPack } from "../apps/runner/videoops-media-pack";
const valid = () => ({
  name: "My reference",
  styleIntake: "Use this original product capture",
  rights: "I own the provided fixture",
  assets: [
    {
      name: "city.png",
      description: "Controlled test media",
      dataBase64: Buffer.from("fixture").toString("base64"),
    },
  ],
});
async function fixture(fn: (registryRoot: string) => Promise<void>) {
  const registryRoot = await realpath(
    await mkdtemp(resolve(tmpdir(), "city-upload-")),
  );
  try {
    await fn(registryRoot);
  } finally {
    await rm(registryRoot, { recursive: true, force: true });
  }
}
test("uploads register immutable bytes with operator provenance and clean private temporary files", () =>
  fixture(async (registryRoot) => {
    const result = await registerUploadedVideoopsPack({
      registryRoot,
      input: valid(),
    });
    const manifest = await inspectVideoopsMediaPack({
      registryRoot,
      packId: result.packId,
    });
    expect(manifest.assets[0].path).toBe("assets/captured/city.png");
    expect(manifest.assets[0].rightsEvidence).toContain("Operator-attested");
    expect(manifest.styleIntake).toContain(
      "Do not present imagery as evidence",
    );
    expect(await readdir(registryRoot)).toEqual([result.packId]);
  }));
test("rejects traversal, host paths, URLs, hidden names, duplicate names and unknown fields", () =>
  fixture(async (registryRoot) => {
    for (const name of [
      "../city.png",
      "/tmp/city.png",
      "https://test/city.png",
      ".city.png",
      "folder/city.png",
      "folder\\city.png",
      "bad.svg",
    ]) {
      const input = valid();
      input.assets[0].name = name;
      await expect(
        registerUploadedVideoopsPack({ registryRoot, input }),
      ).rejects.toThrow();
    }
    const duplicate = valid();
    duplicate.assets.push({ ...duplicate.assets[0], name: "CITY.png" });
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input: duplicate }),
    ).rejects.toThrow();
    await expect(
      registerUploadedVideoopsPack({
        registryRoot,
        input: { ...valid(), sourceRoot: "/tmp" },
      }),
    ).rejects.toThrow();
    const assetExtra = valid();
    Object.assign(assetExtra.assets[0], { hostPath: "/tmp/x" });
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input: assetExtra }),
    ).rejects.toThrow();
    expect(await readdir(registryRoot)).toEqual([]);
  }));
test("strict base64 rejects whitespace, noncanonical padding bits and empty bytes", () =>
  fixture(async (registryRoot) => {
    for (const dataBase64 of [
      "",
      "YQ==\n",
      "YQ=",
      "YR==",
      "data:image/png;base64,YQ==",
      "%%%%",
      "a===",
    ]) {
      const input = valid();
      input.assets[0].dataBase64 = dataBase64;
      await expect(
        registerUploadedVideoopsPack({ registryRoot, input }),
      ).rejects.toThrow();
    }
  }));
test("enforces per-file, total bytes and file count bounds", () =>
  fixture(async (registryRoot) => {
    const input = valid();
    input.assets[0].dataBase64 = Buffer.alloc(4 * 1024 * 1024 + 1).toString(
      "base64",
    );
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input }),
    ).rejects.toThrow();
    const total = valid();
    total.assets = Array.from({ length: 4 }, (_, i) => ({
      ...total.assets[0],
      name: `a${i}.png`,
      dataBase64: Buffer.alloc(4 * 1024 * 1024).toString("base64"),
    }));
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input: total }),
    ).rejects.toThrow("budget");
    const count = valid();
    count.assets = Array.from({ length: 9 }, (_, i) => ({
      ...count.assets[0],
      name: `a${i}.png`,
    }));
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input: count }),
    ).rejects.toThrow();
    expect(await readdir(registryRoot)).toEqual([]);
  }));
test("audio uploads require explicit role and duration", () =>
  fixture(async (registryRoot) => {
    const input = valid();
    input.assets[0].name = "voice.mp3";
    await expect(
      registerUploadedVideoopsPack({ registryRoot, input }),
    ).rejects.toThrow("audio");
    Object.assign(input.assets[0], { audioRole: "voice", durationSeconds: 3 });
    const result = await registerUploadedVideoopsPack({ registryRoot, input });
    expect(result.manifest.assets[0]).toMatchObject({
      audioRole: "voice",
      durationSeconds: 3,
      path: "assets/audio/voice.mp3",
    });
  }));
