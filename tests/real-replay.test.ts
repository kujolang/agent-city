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

it("replays the real Phase 1 MCP/task/handoff/repair/preflight cohort with immutable evidence", async () => {
  const { initialPresentation, plan, advance } = await import(
    "../packages/world-core/index"
  );
  const events = readFileSync(
    "tests/fixtures/phase1-observations.jsonl",
    "utf8",
  )
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as CityEvent);
  const run = () => {
    let truth = initialTruth(),
      presentation = initialPresentation();
    for (const e of events) {
      validateEvent(e);
      truth = reduceTruth(truth, e);
      presentation = plan(presentation, e);
      for (let i = 0; i < 6; i++) presentation = advance(presentation, truth);
    }
    return { truth, presentation };
  };
  const first = run();
  expect(first).toEqual(run());
  expect(Object.keys(first.truth.agents)).toHaveLength(5);
  const ops = Object.values(first.truth.agents).flatMap((a) =>
    Object.values(a.operations),
  );
  expect(ops.find((o) => o.capability === "mcp.call")?.metadata?.server).toBe(
    "mcp-demo",
  );
  expect(ops.find((o) => o.capability === "mcp.call")?.metadata?.tool).toBe(
    "read_project_docs",
  );
  expect(
    ops.some(
      (o) => o.capability === "agent.handoff" && o.metadata?.relatedInstance,
    ),
  ).toBe(true);
  expect(
    ops.some(
      (o) =>
        o.capability === "dispatch.task" &&
        o.metadata?.taskState === "completed",
    ),
  ).toBe(true);
  expect(
    ops.some(
      (o) =>
        o.operationId === "content" && o.attempt === 1 && o.status === "failed",
    ),
  ).toBe(true);
  expect(
    ops.some(
      (o) =>
        o.operationId === "content" &&
        o.attempt === 2 &&
        o.status === "succeeded",
    ),
  ).toBe(true);
  expect(
    ops.some(
      (o) =>
        o.capability === "workcell.execute" &&
        o.status === "failed" &&
        o.metadata?.resultCode === "preparing:exit-4",
    ),
  ).toBe(true);
});
