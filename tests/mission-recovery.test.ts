import { expect, test } from "vitest";
import { mkdtemp, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  missionOutcome,
  readMissionOutcome,
} from "../apps/runner/mission-recovery";
const job = { id: "mission-test", kind: "kujo" };
const base = {
  ...job,
  startedAt: "2026-10-07T00:00:00Z",
  finishedAt: "2026-10-07T00:00:01Z",
};
test("recovery cannot turn missing or contradictory exit metadata into a terminal outcome", () => {
  expect(missionOutcome({ ...base, status: "failed" }, job)).toBeNull();
  for (const code of [undefined, false, "1", -1, 256, 1.5, 0])
    expect(missionOutcome({ ...base, status: "failed", code }, job)).toBeNull();
  for (const code of [1, 130, null])
    expect(
      missionOutcome({ ...base, status: "failed", code }, job)?.status,
    ).toBe("failed");
  expect(
    missionOutcome({ ...base, status: "completed", code: 0 }, job)?.status,
  ).toBe("completed");
  // Producer wall clocks can move backward; terminal truth is not inferred from duration.
  expect(
    missionOutcome(
      {
        ...base,
        status: "completed",
        code: 0,
        finishedAt: "2025-01-01T00:00:00Z",
      },
      job,
    )?.status,
  ).toBe("completed");
  for (const patch of [
    { id: "other" },
    { kind: "writing" },
    { finishedAt: "unknown" },
    { status: "completed", code: 1 },
  ])
    expect(
      missionOutcome({ ...base, status: "failed", code: 1, ...patch }, job),
    ).toBeNull();
});
test("bounded read preserves malformed evidence and later accepts explicit repaired receipt without rewriting it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-mission-recovery-"));
  const file = join(dir, "receipt.json");
  try {
    expect(await readMissionOutcome(file, job)).toBeNull();
    for (const text of [
      '{"status":',
      " ".repeat(1024 * 1024 + 1),
      JSON.stringify({ ...base, status: "failed" }),
    ]) {
      await writeFile(file, text);
      expect(await readMissionOutcome(file, job)).toBeNull();
      expect(await readFile(file, "utf8")).toBe(text);
    }
    const text = JSON.stringify({ ...base, status: "failed", code: 1 });
    await writeFile(file, text);
    expect((await readMissionOutcome(file, job))?.status).toBe("failed");
    expect(await readFile(file, "utf8")).toBe(text);
    const link = join(dir, "linked-receipt.json");
    await symlink(file, link);
    expect(await readMissionOutcome(link, job)).toBeNull();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
