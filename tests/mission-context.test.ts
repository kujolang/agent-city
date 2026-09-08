import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
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
