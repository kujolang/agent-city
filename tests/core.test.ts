import { describe, it, expect } from "vitest";
import {
  reduceTruth,
  initialTruth,
  initialPresentation,
  plan,
  advance,
  route,
  visualLabel,
  type OperationEvent,
} from "../packages/world-core/index";
import { validateEvent, type CityEvent } from "../packages/protocol/index";
const event = (
  n: number,
  type: OperationEvent["type"] = "operation.started",
  op = "rag",
  instance = "source:run:worker",
): OperationEvent => ({
  schema: "agent-city.event.v1",
  eventId: "event-" + n,
  workspace: "local-agent-city",
  source: "source",
  order: n,
  occurredAt: 1000 + n * 10,
  observedAt: 2000 + n * 10,
  completeness: "complete",
  evidence: [
    {
      recordId: "record-" + n,
      hash: "a".repeat(64),
      sourceSequence: n,
      origin: "canonical",
    },
  ],
  type,
  instance,
  profile: "docs",
  run: { namespace: "source", id: "run" },
  task: { namespace: "dispatch", id: "task" },
  operation: {
    id: op,
    attempt: 1,
    capability: "rag.query",
    collection: "kujo-docs",
    outcome:
      type === "operation.started"
        ? "unset"
        : type === "operation.failed"
          ? "failed"
          : "succeeded",
  },
});
describe("truth and presentation boundary", () => {
  it("validates strict payloads, phases, versions, unknown fields and identity", () => {
    validateEvent(event(1));
    for (const bad of [
      { ...event(1), schema: "v2" },
      { ...event(1), instance: "" },
      { ...event(1), prompt: "secret" },
      { ...event(1), type: "operation.finished" },
      { ...event(1), operation: { ...event(1).operation, attempt: 0 } },
      { ...event(1), evidence: [] },
    ])
      expect(() => validateEvent(bad)).toThrow();
  });
  it("keeps terminal truth monotonic after a late start and rejects contradiction", () => {
    let s = reduceTruth(initialTruth(), event(2, "operation.finished"));
    s = reduceTruth(s, event(1));
    const a = Object.values(s.agents)[0];
    expect(Object.values(a.operations)[0].status).toBe("succeeded");
    expect(Object.values(a.operations)[0].started).toBe(1010);
    expect(() => reduceTruth(s, event(3, "operation.failed"))).toThrow(
      "contradictory",
    );
    expect(reduceTruth(s, event(1))).toEqual(s);
  });
  it("retains failures separately from retry attempts", () => {
    let s = reduceTruth(initialTruth(), event(1, "operation.failed"));
    const retry = event(2);
    retry.operation.attempt = 2;
    s = reduceTruth(s, retry);
    expect(
      Object.values(Object.values(s.agents)[0].operations).map((o) => o.status),
    ).toEqual(["failed", "active"]);
  });
  it("compresses 15 retrievals in four seconds into one visit with individual evidence", () => {
    let s = initialTruth(),
      p = initialPresentation();
    for (let i = 0; i < 15; i++) {
      for (const e of [
        event(2 * i + 1, "operation.started", "q" + i),
        event(2 * i + 2, "operation.finished", "q" + i),
      ]) {
        s = reduceTruth(s, e);
        p = plan(p, e);
      }
    }
    expect(Object.values(s.agents)[0].operations).toSatisfy(
      (o) => Object.keys(o).length === 15,
    );
    const w = Object.values(p.walkers)[0];
    expect(w.queued.length).toBe(1);
    expect(w.queued[0].keys.length).toBe(15);
    for (let i = 0; i < 200; i++) p = advance(p);
    expect(Object.values(p.walkers)[0].visits).toBe(1);
  });
  it("keeps identity across Workshop, city and Library with completed truth", () => {
    const a = event(1),
      end = event(2, "operation.finished");
    let p = plan(plan(initialPresentation(), a), end),
      s = reduceTruth(reduceTruth(initialTruth(), a), end);
    const scenes = new Set<string>();
    for (let i = 0; i < 90; i++) {
      p = advance(p);
      const w = p.walkers[a.instance];
      scenes.add(w.scene);
      expect(w.id).toBe(a.instance);
      expect(Object.values(s.agents[a.instance].operations)[0].status).toBe(
        "succeeded",
      );
    }
    expect([...scenes]).toContain("library");
    expect([...scenes]).toContain("city");
    expect(
      visualLabel(p.walkers[a.instance], s.agents[a.instance], "STALE"),
    ).toContain("STALE");
  });
  it("replays identically and separates same-profile execution instances", () => {
    const input = [
      event(1),
      event(2, "operation.failed"),
      event(3, "operation.started", "q2", "source:run:worker2"),
    ];
    const replay = () => {
      let truth = initialTruth(),
        presentation = initialPresentation();
      for (const e of input) {
        truth = reduceTruth(truth, e);
        presentation = plan(presentation, e);
        for (let i = 0; i < 10; i++) presentation = advance(presentation);
      }
      return { truth, presentation };
    };
    expect(replay()).toEqual(replay());
    expect(Object.keys(replay().truth.agents)).toHaveLength(2);
  });
  it("marks gaps without inventing a task failure or erasing a prior gap on transport recovery", () => {
    const start = event(1);
    start.operation.capability = "agent.run";
    let s = reduceTruth(initialTruth(), start);
    const gap: CityEvent = {
      schema: start.schema,
      eventId: "gap",
      workspace: start.workspace,
      source: start.source,
      order: 2,
      occurredAt: null,
      observedAt: 3000,
      completeness: "partial",
      evidence: start.evidence,
      type: "source.gap",
      reason: "overflow",
    };
    s = reduceTruth(s, gap);
    expect(s.agents[start.instance].status).toBe("running");
    expect(s.health).toBe("STALE");
    s = reduceTruth(s, {
      ...gap,
      eventId: "recover",
      type: "source.reconciled",
      reason: "reconciled",
      order: 3,
    });
    expect(s.gap).toBe(true);
  });
  it("uses stable route tie breaks", () => {
    expect(
      route({ a: ["c", "b"], b: ["d"], c: ["d"], d: [] }, "a", "d"),
    ).toEqual(["a", "b", "d"]);
    expect(route({}, "a", "z")).toEqual([]);
  });
});

it("Workcell invocation waits, verified recent work animates at its authored bay", async () => {
  const { stationFor, animationFor } = await import(
    "../packages/world-core/index"
  );
  const started = event(1);
  started.operation.capability = "workcell.execute";
  started.operation.collection = "unknown";
  expect(stationFor(started.operation)).toBe("workcell-bay");
  const run = (finish: "operation.finished" | "operation.failed" | null) => {
    let truth = reduceTruth(initialTruth(), started);
    let p = plan(initialPresentation(), started);
    if (finish) {
      const terminal = event(2, finish);
      terminal.operation.capability = "workcell.execute";
      terminal.operation.collection = "unknown";
      truth = reduceTruth(truth, terminal);
      p = plan(p, terminal);
    }
    for (let tick = 0; tick < 1000; tick++) {
      const w = p.walkers[started.instance];
      if (w.visit && w.phase === "read" && w.scene === "workshop") {
        expect(w.id).toBe(started.instance);
        expect(w.y).toBe(96);
        return {
          animation: animationFor(w, truth.agents[started.instance], p.tick),
          label: visualLabel(w, truth.agents[started.instance], "LIVE"),
          truth,
          tick,
        };
      }
      p = advance(p, truth);
    }
    throw Error("Workcell bay was not reached");
  };
  expect(run(null).animation).toBe("wait");
  expect(run("operation.finished").animation).toBe("work");
  expect(run("operation.finished").label).toContain("RECENT");
  expect(run("operation.failed").animation).toBe("alert");
  expect(run("operation.finished")).toEqual(run("operation.finished"));
});
