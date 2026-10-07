import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readWorkcellRecord } from "../apps/runner/workcell-recovery";

test("recovery requires matching complete evidence and never modifies pending records", async () => {
  const dir = await realpath(
    await mkdtemp(resolve(tmpdir(), "city-workcell-recovery-")),
  );
  const id = "wc-" + "b".repeat(32);
  const run = resolve(dir, "workcell/workcell-source/.workcell/runs", id);
  const pending = {
    schema: "agent-city.mission-workcell.v1",
    status: "pending",
    run: "run-1",
    producer: "producer-1",
    codeExecuted: null,
  };
  const proof = {
    run: "run-1",
    producer: "producer-1",
    code: 0,
    timedOut: false,
    summary: {
      schema_version: "workcell-run-summary/v1",
      ok: true,
      run_id: id,
    },
  };
  try {
    expect(await readWorkcellRecord(dir)).toBeNull();
    await writeFile(resolve(dir, "workcell.json"), JSON.stringify(pending));
    expect(await readWorkcellRecord(dir)).toMatchObject({
      status: "unverified",
      codeExecuted: null,
    });
    await mkdir(resolve(run, "artifacts"), { recursive: true });
    await writeFile(
      resolve(run, "receipt.json"),
      JSON.stringify({
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
        exported_artifacts: ["city-result.txt", "runtime-version.txt"],
      }),
    );
    await writeFile(resolve(run, "artifacts/city-result.txt"), "5\n");
    await writeFile(
      resolve(run, "artifacts/runtime-version.txt"),
      "kujo fixture\n",
    );
    const file = resolve(dir, "workcell/workcell-proof.json");
    await writeFile(file, JSON.stringify(proof));
    expect(await readWorkcellRecord(dir)).toMatchObject({
      status: "completed",
      recovered: true,
      output: "5\n",
      codeExecuted: true,
    });
    expect(
      JSON.parse(await readFile(resolve(dir, "workcell.json"), "utf8")),
    ).toEqual(pending);
    for (const change of [
      { producer: "other" },
      { run: "other" },
      { code: 1 },
      { timedOut: true },
      { spawnError: "ENOENT" },
    ]) {
      await writeFile(file, JSON.stringify({ ...proof, ...change }));
      expect(await readWorkcellRecord(dir)).toMatchObject({
        status: "unverified",
        codeExecuted: null,
        cleanup: "unknown",
      });
    }
    await writeFile(file, JSON.stringify(proof));
    await rm(resolve(run, "artifacts/city-result.txt"));
    expect(await readWorkcellRecord(dir)).toMatchObject({
      status: "unverified",
      codeExecuted: null,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
