import { test, expect } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { superviseMission } from "../apps/runner/mission-supervisor";
import { readMissionOutcome } from "../apps/runner/mission-recovery";

test("real killed mission has a durable process failure without fabricating task evidence", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "city-supervisor-"));
  const id = "mission-" + "a".repeat(36),
    kind = "writing";
  const file = resolve(directory, "process-receipt.json");
  const expected = {
    id,
    kind,
    schema: "agent-city.mission-process.v1",
    scope: "mission-process-only",
  };
  try {
    const running = superviseMission({
      directory,
      id,
      kind,
      executable: process.execPath,
      args: ["-e", 'setTimeout(()=>process.kill(process.pid,"SIGKILL"),150)'],
      cwd: directory,
      env: process.env,
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(await readMissionOutcome(file, expected)).toBeNull();
    expect(await running).toBe(1);
    expect(await readMissionOutcome(file, expected)).toMatchObject({
      status: "failed",
    });
    const receipt = JSON.parse(await readFile(file, "utf8"));
    expect(receipt.signal).toBe("SIGKILL");
    expect(receipt.code).toBeNull();
    await expect(
      readFile(resolve(directory, "receipt.json")),
    ).rejects.toThrow();
    await expect(
      readFile(resolve(directory, "workcell.json")),
    ).rejects.toThrow();
    await writeFile(file, JSON.stringify({ ...receipt, scope: "workload" }));
    expect(await readMissionOutcome(file, expected)).toBeNull();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
