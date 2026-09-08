import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { validateEvent, type CityEvent } from "../packages/protocol/index";
import { initialTruth, reduceTruth } from "../packages/world-core/index";
it("replays retained real Dispatch/SDK/RAG/handoff/Eval observations deterministically without source execution", () => {
  const events = readFileSync("tests/fixtures/real-observations.jsonl", "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as CityEvent);
  const replay = () =>
    events.reduce((truth, event) => {
      validateEvent(event);
      return reduceTruth(truth, event);
    }, initialTruth());
  const one = replay();
  expect(one).toEqual(replay());
  expect(Object.values(one.agents)).toHaveLength(5);
  expect(Object.values(one.agents).every((a) => a.status === "completed")).toBe(
    true,
  );
  const ops = Object.values(one.agents).flatMap((a) =>
    Object.values(a.operations),
  );
  expect(ops.some((o) => o.capability === "agent.handoff")).toBe(true);
  expect(ops.filter((o) => o.capability === "rag.query")).toHaveLength(4);
  expect(
    ops.some((o) => o.capability === "evaluation.run" && o.status === "failed"),
  ).toBe(true);
  expect(one.gap).toBe(true);
});
