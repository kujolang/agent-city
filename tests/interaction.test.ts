import { it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { readCheckpoint, answerCheckpoint } from "../apps/runner/checkpoint";
import { replaySchedule } from "../apps/web/playback";
import {
  initialTruth,
  reduceTruth,
  initialPresentation,
  plan,
  advance,
} from "../packages/world-core";
import type { CityEvent } from "../packages/protocol";
it("answers only an unexpired checkpoint exactly once with atomic content", async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "city-checkin-"));
  try {
    const file = resolve(dir, "checkpoint.json");
    await writeFile(
      file,
      JSON.stringify({
        id: "coder-1",
        question: "Which output?",
        deadline: Date.now() + 60_000,
      }),
    );
    await expect(
      answerCheckpoint(dir, "../escape", "answer"),
    ).rejects.toThrow();
    await expect(
      answerCheckpoint(dir, "coder-1", "x".repeat(8193)),
    ).rejects.toThrow();
    const results = await Promise.allSettled([
      answerCheckpoint(dir, "coder-1", "A"),
      answerCheckpoint(dir, "coder-1", "B"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(["A", "B"]).toContain(
      JSON.parse(await readFile(resolve(dir, "answer-coder-1.json"), "utf8"))
        .answer,
    );
    expect(await readCheckpoint(dir)).toBeNull();
    await writeFile(
      file,
      JSON.stringify({
        id: "coder-2",
        question: "expired",
        deadline: Date.now() - 1,
      }),
    );
    await expect(answerCheckpoint(dir, "coder-2", "late")).rejects.toThrow();
    await writeFile(file, "{");
    expect(await readCheckpoint(dir)).toBeNull();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("timed replay preserves every retained event and deterministic semantic/presentation state", async () => {
  const events: CityEvent[] = (
    await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
  )
    .trim()
    .split("\n")
    .map(JSON.parse as any);
  const schedule = replaySchedule(events);
  expect(schedule[0]).toBe(0);
  for (let i = 1; i < schedule.length; i++) {
    expect(schedule[i] - schedule[i - 1]).toBeGreaterThanOrEqual(1);
    expect(schedule[i] - schedule[i - 1]).toBeLessThanOrEqual(40);
  }
  const play = () => {
    let truth = initialTruth(),
      presentation = initialPresentation(),
      cursor = 0;
    for (let tick = 0; tick < schedule.at(-1)! + 1000; tick++) {
      while (cursor < events.length && schedule[cursor] <= tick) {
        const e = events[cursor++];
        truth = reduceTruth(truth, e);
        presentation = plan(presentation, e);
      }
      presentation = advance(presentation, truth);
    }
    return { truth, presentation, cursor };
  };
  const result = play();
  expect(result).toEqual(play());
  expect(result.cursor).toBe(events.length);
  expect(result.truth).toEqual(events.reduce(reduceTruth, initialTruth()));
});
