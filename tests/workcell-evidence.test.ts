import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { verifyWorkcellEvidence } from "../apps/runner/workcell-evidence";

test("Workcell success requires matching completion evidence and real exports", async () => {
  // Resolve macOS /var -> /private/var once; redirected receipt paths remain invalid.
  const { realpath } = await import("node:fs/promises");
  const source = await realpath(
    await mkdtemp(resolve(tmpdir(), "city-workcell-")),
  );
  const id = "wc-" + "a".repeat(32);
  const dir = resolve(source, ".workcell/runs", id);
  const summary = {
    schema_version: "workcell-run-summary/v1",
    ok: true,
    run_id: id,
  };
  const receipt = {
    schema_version: "workcell-receipt/v1",
    run_id: id,
    final_status: "completed",
    exit_code: 0,
    timeout: false,
    cancelled: false,
    cleanup_status: "complete",
    verification: {
      execution_succeeded: true,
      artifacts_exported: true,
      verification_succeeded: true,
      cleanup_succeeded: true,
    },
    exported_artifacts: ["city-result.txt"],
  };
  const save = (value: unknown) =>
    writeFile(resolve(dir, "receipt.json"), JSON.stringify(value));
  try {
    await mkdir(resolve(dir, "artifacts"), { recursive: true });
    await save(receipt);
    await expect(
      verifyWorkcellEvidence(source, summary, ["city-result.txt"]),
    ).rejects.toThrow();
    await writeFile(resolve(dir, "artifacts/city-result.txt"), "5\n");
    const result = await verifyWorkcellEvidence(source, summary, [
      "city-result.txt",
    ]);
    expect(result.artifacts).toEqual([
      {
        name: "city-result.txt",
        bytes: 2,
        sha256:
          "f0b5c2c2211c8d67ed15e75e656c7862d086e9245420892a7de62cd9ec582a06",
      },
    ]);
    await mkdir(resolve(dir, "artifacts/output"));
    await writeFile(
      resolve(dir, "artifacts/output/draft.mp4"),
      Buffer.alloc(4_000_001),
    );
    await save({ ...receipt, exported_artifacts: ["output/draft.mp4"] });
    await expect(
      verifyWorkcellEvidence(source, summary, ["output/draft.mp4"]),
    ).rejects.toThrow();
    expect(
      (
        await verifyWorkcellEvidence(source, summary, ["output/draft.mp4"], {
          "output/draft.mp4": 33554432,
        })
      ).artifacts[0].bytes,
    ).toBe(4_000_001);
    await expect(
      verifyWorkcellEvidence(source, summary, ["output/draft.mp4"], {
        "output/draft.mp4": 33554433,
      }),
    ).rejects.toThrow("limit");
    await expect(
      verifyWorkcellEvidence(source, summary, ["output/draft.mp4"], {
        "other.mp4": 100,
      }),
    ).rejects.toThrow("limit");
    await mkdir(resolve(dir, "artifacts/project/src"), { recursive: true });
    await writeFile(
      resolve(dir, "artifacts/project/src/main.kujo"),
      "print(5)\n",
    );
    await save({ ...receipt, exported_artifacts: ["project/src/main.kujo"] });
    const nested = await verifyWorkcellEvidence(source, summary, [
      "project/src/main.kujo",
    ]);
    expect(nested.artifacts[0].bytes).toBe(9);
    await rm(resolve(dir, "artifacts/project/src"), { recursive: true });
    await symlink(
      resolve(dir, "artifacts"),
      resolve(dir, "artifacts/project/src"),
    );
    await save({
      ...receipt,
      exported_artifacts: ["project/src/city-result.txt"],
    });
    await expect(
      verifyWorkcellEvidence(source, summary, ["project/src/city-result.txt"]),
    ).rejects.toThrow();
    for (const change of [
      { run_id: "different" },
      { exit_code: 1 },
      { timeout: true },
      { cancelled: true },
      { cleanup_status: "unknown" },
      { exported_artifacts: [] },
      { verification: {} },
    ]) {
      await save({ ...receipt, ...change });
      await expect(
        verifyWorkcellEvidence(source, summary, ["city-result.txt"]),
      ).rejects.toThrow();
    }
    await save(receipt);
    await expect(
      verifyWorkcellEvidence(
        source,
        { ...summary, run_id: "../../elsewhere" },
        [],
      ),
    ).rejects.toThrow();
    await expect(verifyWorkcellEvidence(source, null, [])).rejects.toThrow();
    await rm(resolve(dir, "artifacts/city-result.txt"));
    await writeFile(resolve(source, "outside.txt"), "5\n");
    await symlink(
      resolve(source, "outside.txt"),
      resolve(dir, "artifacts/city-result.txt"),
    );
    await expect(
      verifyWorkcellEvidence(source, summary, ["city-result.txt"]),
    ).rejects.toThrow();
  } finally {
    await rm(source, { recursive: true, force: true });
  }
});
