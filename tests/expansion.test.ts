import { it, expect } from "vitest";
import {
  initialTruth,
  initialPresentation,
  reduceTruth,
  plan,
  advance,
  route,
  buildingState,
  buildingSummary,
  animationFor,
  type OperationEvent,
} from "../packages/world-core/index";
import world from "../assets/compiled/world.json";
import { validateEvent } from "../packages/protocol/index";
const e = (
  n: number,
  cap: OperationEvent["operation"]["capability"],
  outcome: "unset" | "succeeded" | "failed" | "skipped" = "unset",
  attempt = 1,
): OperationEvent => ({
  schema: "agent-city.event.v1",
  workspace: "local-agent-city",
  eventId: "e" + n,
  source: "source",
  order: n,
  occurredAt: n * 100,
  observedAt: n * 100,
  completeness: "complete",
  type:
    outcome === "unset"
      ? "operation.started"
      : outcome === "failed"
        ? "operation.failed"
        : "operation.finished",
  instance: "source:run:actor",
  profile: "unknown",
  run: { namespace: "source", id: "run" },
  task: { namespace: "dispatch", id: "task" },
  operation: {
    id: cap,
    attempt,
    capability: cap,
    collection: "unknown",
    outcome,
  },
  evidence: [
    {
      origin: "canonical",
      recordId: "r" + n,
      hash: "a".repeat(64),
      sourceSequence: n,
    },
  ],
});
it("all six rooms have reciprocal doors, reachable stations and authored slots", () => {
  for (const scene of [
    "workshop",
    "library",
    "mcp",
    "meeting",
    "dojo",
    "dispatch",
  ] as const) {
    const m = world.maps[scene];
    expect(m.objects.some((o) => o.id === "exit")).toBe(true);
    const door = world.maps.city.objects.find((o) => o.id === scene + "-door")!;
    expect(
      route(world.graph, "6,7", door.x / 16 + ",7").length,
    ).toBeGreaterThan(0);
    for (const station of m.objects.filter((o) => o.kind === "station")) {
      expect((station as any).slots).toBe("-4,0,4");
      expect(
        route(m.navigation, "16,160", station.x + "," + station.y).length,
      ).toBeGreaterThan(0);
    }
  }
});
it("MCP retains explicit server/tool/call/attempt metadata and completed truth during travel", () => {
  let a = e(1, "mcp.call"),
    b = e(2, "mcp.call", "succeeded");
  a.operation.metadata = b.operation.metadata = {
    server: "kujo-mcp",
    tool: "read_project_docs",
    invocation: "call-1",
    resultCode: "returned",
  };
  validateEvent(a);
  validateEvent(b);
  let t = reduceTruth(reduceTruth(initialTruth(), a), b),
    p = plan(plan(initialPresentation(), a), b);
  const scenes = new Set<string>();
  for (let i = 0; i < 260; i++) {
    p = advance(p, t);
    scenes.add(p.walkers[a.instance].scene);
    expect(Object.values(t.agents[a.instance].operations)[0].status).toBe(
      "succeeded",
    );
  }
  expect([...scenes]).toContain("mcp");
  expect(p.walkers[a.instance].visits).toBe(1);
  // Late terminal delivery cannot schedule a second physical trip.
  expect(
    plan(p, { ...b, eventId: "late" }).walkers[a.instance].queued.length,
  ).toBe(0);
});
it("handoffs and assignments make evidence packets without fabricated meetings or dialogue", () => {
  let p = plan(initialPresentation(), e(1, "agent.handoff"));
  p = plan(p, e(2, "dispatch.task", "succeeded"));
  expect(p.walkers["source:run:actor"].queued).toHaveLength(0);
  expect(p.walkers["source:run:actor"].scene).toBe("workshop");
  expect(p.walkers["source:run:actor"].packetEvidence).toEqual(["e1", "e2"]);
  expect(animationFor(p.walkers["source:run:actor"], undefined, 0)).toBe(
    "inspect",
  );
});
it("retains failed, skipped and repaired attempts with health independent of outcomes", () => {
  let t = initialTruth();
  for (const ev of [
    e(1, "evaluation.run", "failed"),
    e(2, "evaluation.run", "skipped", 2),
    e(3, "evaluation.run", "succeeded", 3),
  ])
    t = reduceTruth(t, ev);
  const state = buildingState("dojo", t, 400, "LIVE");
  expect(state.failures).toBe(1);
  expect(state.operations).toHaveLength(3);
  expect(buildingState("dojo", t, 40000, "LIVE").sourceHealth).toBe("RECENT");
  expect(buildingState("mcp", t, 400, "LIVE").sourceHealth).toBe(
    "NO LIVE SOURCE",
  );
  expect(buildingState("dojo", t, 400, "STALE").sourceHealth).toBe("STALE");
});
it("A star routes around obstacles deterministically regardless of adjacency order", () => {
  const graph = {
    "0,0": ["0,1", "1,0"],
    "1,0": ["0,0", "2,0"],
    "2,0": ["1,0", "2,1"],
    "0,1": ["0,0"],
    "2,1": ["2,0"],
  };
  expect(route(graph, "0,0", "2,1")).toEqual(["0,0", "1,0", "2,0", "2,1"]);
  const reversed = Object.fromEntries(
    Object.entries(graph)
      .reverse()
      .map(([k, v]) => [k, [...v].reverse()]),
  );
  expect(route(reversed, "0,0", "2,1")).toEqual(route(graph, "0,0", "2,1"));
});
it("new execution attempt becomes active without erasing or reopening terminal prior attempts", () => {
  let t = reduceTruth(initialTruth(), e(1, "execution.run", "succeeded"));
  t = reduceTruth(t, e(2, "execution.run", "unset", 2));
  expect(t.agents["source:run:actor"].status).toBe("running");
  t = reduceTruth(t, e(3, "execution.run", "succeeded", 1));
  expect(t.agents["source:run:actor"].status).toBe("running");
});

it("follow does not stop for UNKNOWN intake before the SDK start arrives", async () => {
  const { followComplete } = await import("../packages/world-core/index");
  const ev = e(1, "dispatch.task", "succeeded"),
    t = reduceTruth(initialTruth(), ev),
    p = plan(initialPresentation(), ev),
    w = p.walkers[ev.instance];
  w.age = 100;
  expect(followComplete(w, t.agents[ev.instance])).toBe(false);
  const terminal = reduceTruth(t, e(2, "agent.run", "succeeded"));
  expect(followComplete(w, terminal.agents[ev.instance])).toBe(true);
  w.phase = "enter";
  expect(followComplete(w, terminal.agents[ev.instance])).toBe(false);
});

it("canvas building summaries match inspector truth across freshness and outcome states", () => {
  let truth = initialTruth();
  for (const ev of [
    e(1, "evaluation.run", "failed"),
    e(2, "rag.query", "succeeded"),
    e(3, "agent.run"),
    e(4, "agent.handoff", "succeeded"),
    e(5, "tool.execute"),
  ])
    truth = reduceTruth(truth, ev);
  for (const scene of Object.keys(world.maps) as Parameters<
    typeof buildingState
  >[0][])
    for (const now of [500, 30500, 30501, 40000])
      for (const transport of ["LIVE", "STALE", "REPLAY", "UNKNOWN"]) {
        const detailed = buildingState(scene, truth, now, transport);
        expect(buildingSummary(scene, truth, now, transport)).toEqual({
          operationCount: detailed.operations.length,
          active: detailed.active,
          failures: detailed.failures,
          sourceHealth: detailed.sourceHealth,
        });
      }
});
