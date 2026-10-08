import { expect, test } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  stageVideoopsRender,
  validateVideoopsRenderInput,
} from "../apps/runner/videoops-render-input";
const input = () => ({
  schema: "agent-city.videoops-render-input.v1",
  width: 640,
  height: 360,
  fps: 30,
  durationSeconds: 3,
  composition: {
    schema: "agent-city.videoops-artifacts.v1",
    files: [
      {
        path: "production/hyperframes/index.html",
        content: "<!doctype html><p>Controlled fixture</p>",
      },
      { path: "production/production-notes.md", content: "Fixture only" },
    ],
  },
});
test("isolated render admission bounds resources and forbids runtime replacement", () => {
  expect(validateVideoopsRenderInput(input()).fps).toBe(30);
  for (const value of [
    { ...input(), width: 4096 },
    { ...input(), durationSeconds: 61 },
    { ...input(), fps: 0 },
    { ...input(), command: ["sh"] },
    { ...input(), durationSeconds: 0.01 },
  ])
    expect(() => validateVideoopsRenderInput(value)).toThrow();
  const replaced = input();
  replaced.composition.files.push({
    path: "production/hyperframes/gsap.min.js",
    content: "replace runtime",
  });
  expect(() => validateVideoopsRenderInput(replaced)).toThrow();
});
test("render staging preserves requested bytes and rejects reuse of prior source", async () => {
  const source = await mkdtemp(join(tmpdir(), "city-render-input-"));
  try {
    await stageVideoopsRender(source, input());
    expect(
      await readFile(join(source, "production/hyperframes/index.html"), "utf8"),
    ).toBe(input().composition.files[0].content);
    expect(
      JSON.parse(await readFile(join(source, "render-request.json"), "utf8")),
    ).toMatchObject({ width: 640, durationSeconds: 3 });
    await expect(stageVideoopsRender(source, input())).rejects.toThrow();
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});
