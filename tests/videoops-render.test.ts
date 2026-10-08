import { test, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  saveVideoopsAttempt,
  readVideoopsAttempt,
} from "../apps/runner/videoops-artifacts";
import { renderVideoopsAttempt } from "../apps/runner/videoops-render";

test("changed or redirected Editor bytes cannot start a render; uncertain execution never retries", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-editor-render-"));
  try {
    const editor = await saveVideoopsAttempt({
      workspace,
      stage: "hyperframes-editor",
      attempt: 1,
      execution: "fixture:editor:1",
      bundle: {
        schema: "agent-city.videoops-artifacts.v1",
        files: [
          {
            path: "production/hyperframes/index.html",
            content: "Original HTML",
          },
          { path: "production/production-notes.md", content: "Fixture" },
        ],
      },
    });
    const file = join(editor.directory, "production/hyperframes/index.html");
    let calls = 0;
    const execute = async () => {
      calls++;
      return { code: null, timedOut: true, output: "controlled timeout" };
    };
    const options = {
      root: workspace,
      runtime: join(workspace, "render"),
      image: "sha256:" + "a".repeat(64),
      producer: "fixture",
      run: "run",
      task: "task",
      spool: join(workspace, "spool"),
      editor,
      width: 640,
      height: 360,
      fps: 30,
      durationSeconds: 3,
    };
    await writeFile(file, "Modified HTML");
    await expect(renderVideoopsAttempt(options, execute)).rejects.toThrow(
      "checksum",
    );
    expect(calls).toBe(0);
    await rm(file);
    const outside = join(workspace, "outside.html");
    await writeFile(outside, "Original HTML");
    await symlink(outside, file);
    await expect(readVideoopsAttempt(editor)).rejects.toThrow("changed");
    await rm(file);
    await writeFile(file, "Original HTML");
    await expect(renderVideoopsAttempt(options, execute)).rejects.toThrow(
      "reconciliation",
    );
    expect(calls).toBe(1);
    expect(
      JSON.parse(await readFile(join(options.runtime, "failed.json"), "utf8"))
        .productionApproval,
    ).toBe("NOT_ESTABLISHED");
    await expect(renderVideoopsAttempt(options, execute)).rejects.toThrow();
    expect(calls).toBe(1);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("successful child exit without verified Workcell artifacts never produces a candidate", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-render-evidence-"));
  try {
    const editor = await saveVideoopsAttempt({
      workspace,
      stage: "hyperframes-editor",
      attempt: 1,
      execution: "fixture:editor:1",
      bundle: {
        schema: "agent-city.videoops-artifacts.v1",
        files: [
          { path: "production/hyperframes/index.html", content: "Fixture" },
          { path: "production/production-notes.md", content: "Fixture" },
        ],
      },
    });
    const runtime = join(workspace, "render");
    await expect(
      renderVideoopsAttempt(
        {
          root: workspace,
          runtime,
          image: "sha256:" + "a".repeat(64),
          producer: "fixture",
          run: "run",
          task: "task",
          spool: join(workspace, "spool"),
          editor,
          width: 640,
          height: 360,
          fps: 30,
          durationSeconds: 3,
        },
        async () => ({ code: 0, timedOut: false, output: "success claimed" }),
      ),
    ).rejects.toThrow();
    await expect(readFile(join(runtime, "candidate.json"))).rejects.toThrow();
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
