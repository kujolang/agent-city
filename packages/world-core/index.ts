import world from "../../assets/compiled/world.json";
import type { CityEvent } from "../protocol/generated";
export type OperationEvent = Extract<
  CityEvent,
  { type: "operation.started" | "operation.finished" | "operation.failed" }
>;
export interface Operation {
  key: string;
  capability: string;
  collection: string;
  status: string;
  started: number | null;
  finished: number | null;
  evidence: Array<CityEvent["evidence"][number]>;
  partial: boolean;
}
export interface Agent {
  id: string;
  profile: string;
  run: OperationEvent["run"];
  task: OperationEvent["task"];
  status: string;
  lastObserved: number;
  completeness: string;
  operations: Record<string, Operation>;
}
export interface Truth {
  agents: Record<string, Agent>;
  seen: string[];
  health: "UNKNOWN" | "LIVE" | "STALE";
  gap: boolean;
  order: number;
}
export const initialTruth = (): Truth => ({
  agents: {},
  seen: [],
  health: "UNKNOWN",
  gap: false,
  order: 0,
});
export function reduceTruth(state: Truth, e: CityEvent): Truth {
  if (state.seen.includes(e.eventId)) return state;
  const s = structuredClone(state);
  s.seen = [...s.seen, e.eventId].slice(-2000);
  s.order = e.order;
  if (e.type === "source.gap") {
    s.gap = true;
    s.health = "STALE";
    for (const a of Object.values(s.agents)) a.completeness = "partial";
    return s;
  }
  if (e.type === "source.reconciled") {
    s.health = "LIVE";
    return s;
  } // Transport recovery cannot erase missing history.
  s.health = "LIVE";
  const key = [
    e.run.namespace,
    e.run.id,
    e.operation.id,
    e.operation.attempt,
  ].join(":");
  const a = (s.agents[e.instance] ??= {
    id: e.instance,
    profile: e.profile,
    run: e.run,
    task: e.task,
    status: "unknown",
    lastObserved: e.observedAt,
    completeness: s.gap ? "partial" : e.completeness,
    operations: {},
  });
  a.lastObserved = e.observedAt;
  const prior = a.operations[key],
    terminal = e.type !== "operation.started";
  if (
    prior &&
    prior.status !== "active" &&
    terminal &&
    prior.status !== e.operation.outcome
  )
    throw Error("contradictory terminal outcome");
  const op = (a.operations[key] ??= {
    key,
    capability: e.operation.capability,
    collection: e.operation.collection,
    status: "active",
    started: null,
    finished: null,
    evidence: [],
    partial: terminal,
  });
  op.evidence = [...op.evidence, ...e.evidence].slice(-24);
  if (terminal) {
    if (!op.started) a.completeness = "partial";
    op.status = e.operation.outcome;
    op.finished = e.occurredAt;
  } else {
    op.started = e.occurredAt;
    op.partial = false;
  }
  if (
    ["agent.run", "execution.run"].includes(e.operation.capability) &&
    (terminal || a.status === "unknown")
  )
    a.status = terminal
      ? e.operation.outcome === "succeeded"
        ? "completed"
        : e.operation.outcome
      : "running";
  if (Object.keys(a.operations).length > 256) {
    const oldest = Object.values(a.operations).find(
      (o) => o.status !== "active" && o.key !== key,
    );
    if (oldest) delete a.operations[oldest.key];
  }
  return s;
}
export type Scene = "city" | "workshop" | "library" | "mcp" | "dojo";
export interface Visit {
  capability: string;
  keys: string[];
  first: number;
  last: number;
  collection: string;
  evidence: string[];
}
export interface Walker {
  id: string;
  scene: Scene;
  x: number;
  y: number;
  phase: "work" | "outbound" | "enter" | "read" | "return";
  age: number;
  visit: Visit | null;
  queued: Visit[];
  visits: number;
}
export interface Presentation {
  seen: string[];
  tick: number;
  walkers: Record<string, Walker>;
}
export const initialPresentation = (): Presentation => ({
  seen: [],
  tick: 0,
  walkers: {},
});
export function plan(p: Presentation, e: CityEvent): Presentation {
  if (p.seen.includes(e.eventId) || !e.type.startsWith("operation.")) return p;
  const ev = e as OperationEvent,
    s = structuredClone(p);
  s.seen = [...s.seen, e.eventId].slice(-2000);
  const w = (s.walkers[ev.instance] ??= {
    id: ev.instance,
    scene: "workshop",
    x: 48,
    y: 160,
    phase: "work",
    age: 0,
    visit: null,
    queued: [],
    visits: 0,
  });
  if (!["rag.query", "evaluation.run"].includes(ev.operation.capability))
    return s;
  const key = [
    ev.run.namespace,
    ev.run.id,
    ev.operation.id,
    ev.operation.attempt,
  ].join(":");
  const known = [w.visit, ...w.queued].find((v) => v?.keys.includes(key));
  if (known) {
    if (ev.type !== "operation.started" && w.phase === "read") w.age = 0;
    return s;
  }
  const time = ev.occurredAt ?? ev.observedAt;
  const open = [w.visit, ...w.queued].find(
    (v) =>
      v &&
      Math.abs(time - v.first) <= 4000 &&
      v.collection === ev.operation.collection &&
      v.capability === ev.operation.capability,
  );
  if (open) {
    open.keys.push(key);
    open.last = time;
    open.evidence.push(...ev.evidence.map((r) => r.recordId));
  } else {
    w.queued.push({
      capability: ev.operation.capability,
      keys: [key],
      first: time,
      last: time,
      collection: ev.operation.collection,
      evidence: ev.evidence.map((r) => r.recordId),
    });
    w.queued = w.queued.slice(-6);
  }
  return s;
}
export const stations: Record<string, number> = {
  "kujo-docs": 48,
  "repo-source": 88,
  "project-rag": 128,
  "previous-runs": 168,
  "external-research": 208,
  unknown: 128,
};
export function advance(p: Presentation, truth?: Truth): Presentation {
  const s = structuredClone(p);
  s.tick++;
  for (const w of Object.values(s.walkers).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    w.age++;
    if (w.phase === "work" && w.queued.length && w.age >= 4) {
      w.visit = w.queued.shift()!;
      w.phase = "outbound";
      w.scene = "city";
      w.x = 96;
      w.y = 112;
      w.age = 0;
      w.visits++;
    } else if (w.phase === "outbound") {
      const destination = w.visit?.capability === "evaluation.run" ? 128 : 192;
      const path = route(world.graph, "6,7", destination / 16 + ",7");
      if (!path.length) continue;
      const next =
        path.map((n) => Number(n.split(",")[0]) * 16).find((x) => x > w.x) ??
        destination;
      w.x = Math.min(next, w.x + 4);
      if (w.x === destination) {
        w.phase = "enter";
        w.scene = w.visit?.capability === "evaluation.run" ? "dojo" : "library";
        w.x = 16;
        w.y = 160;
        w.age = 0;
      }
    } else if (w.phase === "enter") {
      const target = stations[w.visit?.collection ?? "unknown"];
      w.x = Math.min(target, w.x + 4);
      if (w.x === target) {
        w.phase = "read";
        w.age = 0;
      }
    } else if (
      w.phase === "read" &&
      w.age >= 28 &&
      !w.visit?.keys.some(
        (k) => truth?.agents[w.id]?.operations[k]?.status === "active",
      )
    ) {
      w.phase = "return";
      w.scene = "city";
      w.x = w.visit?.capability === "evaluation.run" ? 128 : 192;
      w.y = 112;
      w.age = 0;
    } else if (w.phase === "return") {
      const path = route(
        world.graph,
        w.visit?.capability === "evaluation.run" ? "8,7" : "12,7",
        "6,7",
      );
      if (!path.length) continue;
      const next =
        path.map((n) => Number(n.split(",")[0]) * 16).find((x) => x < w.x) ??
        96;
      w.x = Math.max(next, w.x - 4);
      if (w.x === 96) {
        w.phase = "work";
        w.scene = "workshop";
        w.x = 48;
        w.y = 160;
        w.age = 0;
        w.visit = null;
      }
    }
  }
  return s;
}
export function visualLabel(
  w: Walker | undefined,
  a: Agent | undefined,
  health: string,
): string {
  if (health === "STALE") return "STALE · observation coverage interrupted";
  if (!w || !a) return "UNKNOWN";
  if (w.visit) {
    const live = w.visit.keys.some((k) => a.operations[k]?.status === "active");
    return (
      (live ? "LIVE" : "RECENT") +
      " · " +
      w.visit.keys.length +
      (w.visit.capability === "evaluation.run"
        ? " evaluation observation"
        : " retrieval") +
      (w.visit.keys.length === 1 ? "" : "s")
    );
  }
  return a.status === "running"
    ? "LIVE · workspace"
    : "RECENT · final workspace";
}
export function route(
  graph: Record<string, string[]>,
  start: string,
  end: string,
): string[] {
  const q = [[start]],
    seen = new Set([start]);
  while (q.length) {
    const p = q.shift()!,
      last = p.at(-1)!;
    if (last === end) return p;
    for (const n of [...(graph[last] ?? [])].sort()) {
      if (!seen.has(n)) {
        seen.add(n);
        q.push([...p, n]);
      }
    }
  }
  return [];
}

export function badge(id: string): string {
  let hash = 2166136261;
  for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).slice(-3).toUpperCase();
}
export function activityCounts(w: Walker, a: Agent) {
  const ops = w.visit?.keys.map((k) => a.operations[k]).filter(Boolean) ?? [];
  return {
    calls: ops.length,
    active: ops.filter((o) => o.status === "active").length,
    succeeded: ops.filter((o) => o.status === "succeeded").length,
    failed: ops.filter((o) => o.status === "failed").length,
  };
}
