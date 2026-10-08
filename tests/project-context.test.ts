import { test, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  projectContext,
  projectReferences,
} from "../apps/runner/project-context";

test("selected text becomes a private lossless snapshot with metadata-only references", () => {
  const input = Object.freeze([
    Object.freeze({
      path: "src/main.kujo",
      content: "print(42)\n",
      sha256: "untrusted",
    }),
  ]);
  const snapshot = projectContext(input)!;
  expect(snapshot.files[0].content).toBe(input[0].content);
  expect(snapshot.files[0].sha256).toBe(
    createHash("sha256").update(input[0].content).digest("hex"),
  );
  expect(projectReferences(snapshot)).toEqual([
    { path: "src/main.kujo", bytes: 10, sha256: snapshot.files[0].sha256 },
  ]);
  expect(JSON.stringify(projectReferences(snapshot))).not.toContain("print");
  expect(projectContext(undefined)).toBeNull();
  expect(projectContext([])).toBeNull();
});
test("project snapshots reject traversal, binary, duplicate names and byte/count overflow", () => {
  for (const path of [
    "/etc/passwd",
    "../outside",
    "a/../b",
    "C:\\secret",
    "a/./b",
    " space ",
    "",
  ])
    expect(() => projectContext([{ path, content: "x" }])).toThrow();
  for (const content of ["\0", "é".repeat(8193), "\ud800"])
    expect(() => projectContext([{ path: "x", content }])).toThrow();
  expect(() =>
    projectContext([
      { path: "a", content: "" },
      { path: "A", content: "" },
    ]),
  ).toThrow();
  expect(() =>
    projectContext(
      Array.from({ length: 9 }, (_, i) => ({ path: String(i), content: "" })),
    ),
  ).toThrow();
  expect(() =>
    projectContext(
      Array.from({ length: 3 }, (_, i) => ({
        path: String(i),
        content: "x".repeat(12000),
      })),
    ),
  ).toThrow();
});
