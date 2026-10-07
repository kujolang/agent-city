import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  continuationContext,
  missionDetails,
} from "../apps/runner/mission-context";

it("retains original task and actual failed checks without recursively copying conversations", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "city-context-"));
  const id = "mission-00000000-0000-0000-0000-000000000001";
  const dir = resolve(root, id);
  await mkdir(dir);
  try {
    await writeFile(
      resolve(dir, "request.json"),
      JSON.stringify({
        prompt: "Repair this",
        originalTask: "Export sum",
        rootMissionId: id,
      }),
    );
    await writeFile(
      resolve(dir, "reviewed.mjs"),
      "export const sum = () => 4;",
    );
    await writeFile(
      resolve(dir, "functional.json"),
      JSON.stringify({
        status: "failed",
        cases: [{ name: "empty", status: "failed" }],
      }),
    );
    await writeFile(
      resolve(dir, "context.json"),
      "Must not recursively include old context",
    );
    const job = { id, kind: "code" as const, status: "completed" };
    const context = await continuationContext(root, job);
    expect(context.originalTask).toBe("Export sum");
    expect(context.previousRequest).toBe("Repair this");
    expect(context.previousChecks.status).toBe("failed");
    expect(JSON.stringify(context)).not.toContain("recursively include");
    expect(context.previousRuntimeStatus).toBe("completed");
    await expect(
      continuationContext(root, { ...job, status: "unknown" }),
    ).rejects.toThrow("finish");
    await writeFile(resolve(dir, "reviewed.mjs"), "x".repeat(65_537));
    await expect(continuationContext(root, job)).rejects.toThrow("limit");
    // A failed source run must not present a preallocated/partial file as completed.
    expect(
      (await continuationContext(root, { ...job, status: "failed" }))
        .previousArtifact,
    ).toBeNull();
    await expect(
      missionDetails(root, { ...job, id: "../other" }),
    ).rejects.toThrow("Invalid");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("Kujo repair gets prior static/execution evidence without inheriting permission", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "city-kujo-context-"));
  const id = "mission-00000000-0000-0000-0000-000000000002";
  const dir = resolve(root, id);
  await mkdir(dir);
  try {
    await writeFile(
      resolve(dir, "request.json"),
      JSON.stringify({ prompt: "Repair output", executeWorkcell: true }),
    );
    await writeFile(resolve(dir, "reviewed.md"), "print(5)");
    await writeFile(
      resolve(dir, "validation.json"),
      JSON.stringify({
        syntax: "valid",
        codeExecuted: true,
        checkedArtifact: "reviewed.kujo",
      }),
    );
    const record = {
      schema: "agent-city.mission-workcell.v1",
      status: "completed",
      codeExecuted: true,
      cleanup: "complete",
      exitCode: 0,
      evidence: { runId: "retained-run" },
      output: "5\n",
      runtimeVersion: "kujo fixture",
      outputTruncated: false,
    };
    await writeFile(resolve(dir, "workcell.json"), JSON.stringify(record));
    const context = await continuationContext(root, {
      id,
      kind: "kujo",
      status: "completed",
    });
    expect(context.previousValidation.checkedArtifact).toBe("reviewed.kujo");
    expect(context.previousWorkcell).toMatchObject({
      output: "5\n",
      codeExecuted: true,
      evidence: { runId: "retained-run" },
    });
    expect(context).not.toHaveProperty("executeWorkcell");
    expect(
      JSON.parse(await readFile(resolve(dir, "workcell.json"), "utf8")),
    ).toEqual(record);
    await writeFile(
      resolve(dir, "workcell.json"),
      JSON.stringify({
        schema: record.schema,
        status: "unverified",
        codeExecuted: null,
        cleanup: "unknown",
        exitCode: 1,
      }),
    );
    expect(
      (
        await continuationContext(root, {
          id,
          kind: "kujo",
          status: "completed",
        })
      ).previousWorkcell,
    ).toMatchObject({
      status: "unverified",
      codeExecuted: null,
      exitCode: 1,
      output: null,
    });
    await writeFile(
      resolve(dir, "workcell.json"),
      JSON.stringify({ ...record, output: "x".repeat(140000) }),
    );
    await expect(
      continuationContext(root, { id, kind: "kujo", status: "completed" }),
    ).rejects.toThrow("limit");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
