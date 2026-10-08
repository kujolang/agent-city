import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  validateProjectExports,
  validWorkcellArtifactName,
  readProjectOutputs,
} from "../apps/runner/project-exports";
import { projectBundleDownload } from "../apps/web/mission-artifact";

test("export names are explicit bounded files under project, never host paths or Git policy", () => {
  expect(validateProjectExports(undefined, false)).toEqual([]);
  expect(() => validateProjectExports(["src/a.kujo"], false)).toThrow();
  expect(validateProjectExports(["src/a.kujo", "report.txt"], true)).toEqual([
    "src/a.kujo",
    "report.txt",
  ]);
  for (const name of [
    "../secret",
    "/etc/passwd",
    ".git/config",
    ".gitattributes",
    "a/../b",
    "a//b",
  ])
    expect(() => validateProjectExports([name], true)).toThrow();
  for (const names of [
    ["x", "X"],
    ["x", "x/a"],
    Array.from({ length: 9 }, (_, i) => String(i)),
  ])
    expect(() => validateProjectExports(names, true)).toThrow();
  expect(validWorkcellArtifactName("project/src/a.kujo")).toBe(true);
  expect(validWorkcellArtifactName("other/a.kujo")).toBe(false);
  expect(validWorkcellArtifactName("project/../../a.kujo")).toBe(false);
});

test("output bundle uses verified bytes and before hashes; tampering and unsupported text fail", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "city-project-exports-"));
  const runId = "wc-" + "b".repeat(32);
  const file = resolve(
    directory,
    "workcell/workcell-source/.workcell/runs",
    runId,
    "artifacts/project/src/main.kujo",
  );
  const content = "print(42)\n";
  const sha256 = createHash("sha256").update(content).digest("hex");
  const evidence = {
    runId,
    artifacts: [
      {
        name: "project/src/main.kujo",
        bytes: Buffer.byteLength(content),
        sha256,
      },
    ],
  };
  try {
    await mkdir(resolve(file, ".."), { recursive: true });
    await writeFile(file, content);
    const outputs = await readProjectOutputs(
      directory,
      ["src/main.kujo"],
      evidence,
      [{ path: "src/main.kujo", sha256: "old" }],
    );
    expect(outputs[0]).toMatchObject({
      content,
      sha256,
      beforeSha256: "old",
      change: "modified",
    });
    const workcell = {
      status: "completed",
      codeExecuted: true,
      projectExportsStatus: "complete",
      evidence,
      projectOutputs: outputs,
    };
    const bundle = projectBundleDownload("mission-test", workcell)!;
    expect(JSON.parse(bundle.content).files[0]).toEqual(outputs[0]);
    expect(
      projectBundleDownload("mission-test", {
        ...workcell,
        status: "unverified",
      }),
    ).toBeNull();
    expect(
      projectBundleDownload("mission-test", {
        ...workcell,
        projectExportsStatus: "unavailable",
      }),
    ).toBeNull();
    await writeFile(file, "tampered");
    await expect(
      readProjectOutputs(directory, ["src/main.kujo"], evidence),
    ).rejects.toThrow();
    await writeFile(file, Buffer.from([0xff, 0xfe]));
    await expect(
      readProjectOutputs(directory, ["src/main.kujo"], evidence),
    ).rejects.toThrow(/UTF-8/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
