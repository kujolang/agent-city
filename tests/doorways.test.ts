import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import world from "../assets/compiled/world.json";
import {
  route,
  initialPresentation,
  plan,
  advance,
  animationFor,
  type OperationEvent,
} from "../packages/world-core/index";
import type { CityEvent } from "../packages/protocol/index";

it("connects every doorway without routing through building interiors", () => {
  const doors = world.maps.city.objects.filter((o) => o.kind === "portal");
  const buildings = world.maps.city.objects.filter(
    (o) => o.kind === "building",
  );
  for (const from of doors)
    for (const to of doors) {
      const a = `${from.x / 16},${from.y / 16}`,
        b = `${to.x / 16},${to.y / 16}`;
      const path = route(world.graph, a, b);
      expect(path[0]).toBe(a);
      expect(path.at(-1)).toBe(b);
      for (const point of path) {
        const [x, y] = point.split(",").map(Number);
        expect(
          buildings.some(
            (o) =>
              x * 16 + 8 > o.x &&
              x * 16 + 8 < o.x + 64 &&
              y * 16 > o.y &&
              y * 16 < o.y + 64,
          ),
        ).toBe(false);
      }
    }
});

it("real retrieval climbs only the authored ladder and returns without changing identity", () => {
  const events: CityEvent[] = readFileSync(
    "tests/fixtures/real-observations.jsonl",
    "utf8",
  )
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  const event = events.find(
    (e) =>
      e.type.startsWith("operation.") &&
      (e as OperationEvent).operation.capability === "rag.query" &&
      (e as OperationEvent).operation.collection === "kujo-docs",
  ) as OperationEvent;
  expect(event).toBeDefined();
  function run() {
    let p = plan(initialPresentation(), event),
      climbed = 0,
      readUpper = false,
      returned = false;
    const trace: Array<[string, number, number, string]> = [];
    for (let tick = 0; tick < 1000; tick++) {
      const w = p.walkers[event.instance];
      expect(w.id).toBe(event.instance);
      trace.push([w.scene, w.x, w.y, w.phase]);
      if (w.scene === "library" && w.y !== 160 && w.y !== 96) {
        expect(w.x).toBe(224);
        expect(animationFor(w, undefined, p.tick)).toBe("ladder");
        climbed++;
      }
      if (w.scene === "library" && w.phase === "read") {
        expect(w.y).toBe(96);
        readUpper = true;
      }
      if (readUpper && w.scene === "workshop" && w.phase === "work") {
        returned = true;
        break;
      }
      p = advance(p);
    }
    expect(climbed).toBeGreaterThan(0);
    expect(readUpper).toBe(true);
    expect(returned).toBe(true);
    return trace;
  }
  expect(run()).toEqual(run());
});

it("a retained real retrieval reaches the Library threshold before changing scenes", () => {
  const events: CityEvent[] = readFileSync(
    "tests/fixtures/real-observations.jsonl",
    "utf8",
  )
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  const event = events.find(
    (e) =>
      e.type.startsWith("operation.") &&
      (e as OperationEvent).operation.capability === "rag.query",
  ) as OperationEvent;
  expect(event).toBeDefined();
  let state = plan(initialPresentation(), event);
  let lastCity: { x: number; y: number } | null = null,
    entered = false;
  for (let tick = 0; tick < 400; tick++) {
    const walker = state.walkers[event.instance];
    expect(walker.id).toBe(event.instance);
    if (walker.scene === "city") lastCity = { x: walker.x, y: walker.y };
    if (walker.scene === "library") {
      entered = true;
      break;
    }
    state = advance(state);
  }
  expect(entered).toBe(true);
  const door = world.maps.city.objects.find((o) => o.id === "library-door")!;
  expect(lastCity).toEqual({ x: door.x, y: door.y });
});
