import { test, expect } from "vitest";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  admitWorkcellProject,
  stageWorkcellProject,
} from "../apps/runner/workcell-project";

test("snapshot context alone never grants execution; invalid project layouts fail closed", () => {
  const files = [{ path: "inputs/name.txt", content: "hello\n" }];
  expect(admitWorkcellProject(undefined, true, files)).toBeNull();
  expect(admitWorkcellProject(false, true, files)).toBeNull();
  expect(() => admitWorkcellProject(true, false, files)).toThrow();
  expect(() => admitWorkcellProject("true", true, files)).toThrow();
  expect(() => admitWorkcellProject(true, true, [])).toThrow();
  for (const path of [
    "../escape",
    ".git/config",
    "a/.workcell/state",
    "a/.gitattributes",
    ".gitignore",
  ])
    expect(() =>
      admitWorkcellProject(true, true, [{ path, content: "" }]),
    ).toThrow();
  expect(() =>
    admitWorkcellProject(true, true, [
      { path: "A", content: "" },
      { path: "a/b", content: "" },
    ]),
  ).toThrow();
  expect(admitWorkcellProject(true, true, files)?.files[0].content).toBe(
    "hello\n",
  );
});

test("staging preserves bytes in a new private directory and refuses existing trees/symlinks", async () => {
  const source = await mkdtemp(join(tmpdir(), "city-project-stage-"));
  const outside = await mkdtemp(join(tmpdir(), "city-project-outside-"));
  try {
    const files = [{ path: "inputs/name.txt", content: "héllo\r\n" }];
    const refs = await stageWorkcellProject(source, files);
    expect(
      await readFile(join(source, "project/inputs/name.txt"), "utf8"),
    ).toBe(files[0].content);
    expect(refs[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(refs[0]).not.toHaveProperty("content");
    await expect(stageWorkcellProject(source, files)).rejects.toThrow();
    await rm(join(source, "project"), { recursive: true });
    await symlink(outside, join(source, "project"));
    await expect(stageWorkcellProject(source, files)).rejects.toThrow();
    await expect(readFile(join(outside, "inputs/name.txt"))).rejects.toThrow();
  } finally {
    await rm(source, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
