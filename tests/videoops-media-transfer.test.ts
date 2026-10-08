import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  inspectVideoopsMedia,
  validateVideoopsMediaRefs,
} from "../apps/runner/videoops-media-transfer";
import { stageVideoopsRender } from "../apps/runner/videoops-render-input";
test("acquired media enters only the private composition and is hash checked again at staging", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "city-media-")));
  try {
    await mkdir(join(root, "assets/source"), { recursive: true });
    const bytes = Buffer.from("controlled media bytes");
    const path = "assets/source/test.png";
    await writeFile(join(root, path), bytes);
    const asset = {
      path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      rightsEvidence: "fixture:original",
    };
    const media = await inspectVideoopsMedia(root, [asset]);
    const composition = {
      schema: "agent-city.videoops-artifacts.v1",
      files: [
        { path: "production/hyperframes/index.html", content: "Fixture" },
        { path: "production/production-notes.md", content: "Fixture" },
      ],
    };
    const input = {
      schema: "agent-city.videoops-render-input.v1",
      composition,
      media,
      width: 640,
      height: 360,
      fps: 30,
      durationSeconds: 3,
    };
    const target = join(root, "target");
    await mkdir(target);
    await stageVideoopsRender(target, input, root);
    expect(
      await readFile(join(target, "production/hyperframes", path)),
    ).toEqual(bytes);
    expect(
      JSON.parse(await readFile(join(target, "render-request.json"), "utf8"))
        .media[0].sha256,
    ).toBe(asset.sha256);
    await writeFile(join(root, path), Buffer.alloc(bytes.length, 0));
    const changed = join(root, "changed");
    await mkdir(changed);
    await expect(stageVideoopsRender(changed, input, root)).rejects.toThrow(
      "checksum",
    );
    await rm(join(root, path));
    await writeFile(join(root, "outside.png"), bytes);
    await symlink(join(root, "outside.png"), join(root, path));
    await expect(inspectVideoopsMedia(root, [asset])).rejects.toThrow(
      "redirected",
    );
    await expect(
      inspectVideoopsMedia(root, [
        { ...asset, path: "assets/source/../../outside.png" },
      ]),
    ).rejects.toThrow("reference");
    expect(() =>
      validateVideoopsMediaRefs([{ ...asset, bytes: 16777217 }]),
    ).toThrow("reference");
    expect(() =>
      validateVideoopsMediaRefs([{ ...asset, bytes: 1, rightsEvidence: "" }]),
    ).toThrow("reference");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
