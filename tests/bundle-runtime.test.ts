import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { verifiedRuntime } from "../scripts/bundle-runtime";
test("runtime reuse requires verified content, platform and consistent provenance", async () => {
  const root = await mkdtemp(join(tmpdir(), "city-runtime-"));
  const binary = Buffer.from("synthetic binary fixture; never executed");
  const license = Buffer.from("fixture license");
  const entry = (b: Buffer) => ({
    bytes: b.length,
    sha256: createHash("sha256").update(b).digest("hex"),
  });
  const manifest = {
    schema: "agent-city.local-bundle.v1",
    platform: process.platform,
    arch: process.arch,
    sources: { kujo: "a".repeat(40) },
    runtime: { version: "fixture", sha256: entry(binary).sha256 },
    files: {
      "kujo/target/release/kujo": entry(binary),
      "kujo/LICENSE": entry(license),
    },
  };
  const save = (m: unknown) =>
    writeFile(join(root, "bundle-manifest.json"), JSON.stringify(m));
  try {
    await mkdir(join(root, "kujo/target/release"), { recursive: true });
    await writeFile(join(root, "kujo/target/release/kujo"), binary);
    await writeFile(join(root, "kujo/LICENSE"), license);
    await save(manifest);
    const result = await verifiedRuntime(root);
    expect(result.binary.equals(binary)).toBe(true);
    expect(result.license.equals(license)).toBe(true);
    expect(result.source).toBe(manifest.sources.kujo);
    await save({ ...manifest, arch: "other" });
    await expect(verifiedRuntime(root)).rejects.toThrow(
      "platform/architecture",
    );
    await save({
      ...manifest,
      runtime: { ...manifest.runtime, sha256: "b".repeat(64) },
    });
    await expect(verifiedRuntime(root)).rejects.toThrow("inconsistent");
    await save({ ...manifest, sources: {} });
    await expect(verifiedRuntime(root)).rejects.toThrow("provenance");
    await save(manifest);
    await writeFile(join(root, "kujo/target/release/kujo"), "altered");
    await expect(verifiedRuntime(root)).rejects.toThrow("integrity mismatch");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
