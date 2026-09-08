import { test, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { verifyBundle } from "../scripts/bundle-integrity";
test("bundle verification rejects altered content and escaping manifest paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-bundle-"));
  const manifest = {
    schema: "agent-city.local-bundle.v1",
    files: {
      "artifact.txt": {
        bytes: 5,
        sha256: createHash("sha256").update("hello").digest("hex"),
      },
    },
  };
  try {
    await writeFile(join(dir, "artifact.txt"), "hello");
    await writeFile(
      join(dir, "bundle-manifest.json"),
      JSON.stringify(manifest),
    );
    expect((await verifyBundle(dir)).checked).toBe(1);
    await writeFile(join(dir, "artifact.txt"), "wrong");
    await expect(verifyBundle(dir)).rejects.toThrow("integrity mismatch");
    await writeFile(
      join(dir, "bundle-manifest.json"),
      JSON.stringify({
        ...manifest,
        files: { "../outside": manifest.files["artifact.txt"] },
      }),
    );
    await expect(verifyBundle(dir)).rejects.toThrow(
      "Invalid bundle member path",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
