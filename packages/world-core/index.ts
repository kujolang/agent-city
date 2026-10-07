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
  relatedAgent?: string;
  metadata?: OperationEvent["operation"]["metadata"];
  attempt?: number;
  operationId?: string;
  eventIds?: string[];
  observedAt?: number;
}
export interface Agent {
  id: string;
  profile: string;
  run: OperationEvent["run"];
  task: OperationEvent["task"];
  runAttempt?: number;
  taskState?: string;
  workflowState?: string;
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
  return reduceMany(state, [e]);
}
/** Batch copy-on-write: clone each touched agent map once, retaining event-order semantics. */
export function reduceMany(state: Truth, events: CityEvent[]): Truth {
  const s: Truth = {
    ...state,
    agents: { ...state.agents },
    seen: [...state.seen],
  };
  const seen = new Set(s.seen),
    touched = new Set<string>();
  let changed = false;
  for (const e of events) {
    if (seen.has(e.eventId)) continue;
    changed = true;
    if ("instance" in e && s.agents[e.instance] && !touched.has(e.instance)) {
      s.agents[e.instance] = {
        ...s.agents[e.instance],
        operations: { ...s.agents[e.instance].operations },
      };
      touched.add(e.instance);
    }
    s.seen.push(e.eventId);
    seen.add(e.eventId);
    if (s.seen.length > 2000) seen.delete(s.seen.shift()!);
    applyObservation(s, e);
  }
  return changed ? s : state;
}
function applyObservation(s: Truth, e: CityEvent): Truth {
  s.order = e.order;
  if (e.type === "source.gap") {
    s.gap = true;
    s.health = "STALE";
    for (const [id, a] of Object.entries(s.agents))
      s.agents[id] = { ...a, completeness: "partial" };
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
  if (a.profile === "unknown" && e.profile !== "unknown") a.profile = e.profile;
  if (
    e.operation.capability === "dispatch.task" &&
    e.operation.metadata?.taskState
  )
    a.taskState = e.operation.metadata.taskState;
  if (
    e.operation.capability === "dispatch.workflow" &&
    e.operation.metadata?.workflowState
  )
    a.workflowState = e.operation.metadata.workflowState;
  const prior = a.operations[key],
    terminal = e.type !== "operation.started";
  if (
    prior &&
    prior.status !== "active" &&
    terminal &&
    prior.status !== e.operation.outcome
  )
    throw Error("contradictory terminal outcome");
  if (prior) a.operations[key] = { ...prior };
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
  op.relatedAgent = e.operation.relatedAgent;
  op.metadata = { ...op.metadata, ...e.operation.metadata };
  op.attempt = e.operation.attempt;
  op.operationId = e.operation.id;
  op.observedAt = e.observedAt;
  op.eventIds = [...(op.eventIds ?? []), e.eventId].slice(-24);
  op.evidence = [...op.evidence, ...e.evidence].slice(-24);
  if (terminal) {
    if (op.started === null) a.completeness = "partial";
    op.status = e.operation.outcome;
    op.finished = e.occurredAt;
  } else {
    op.started = e.occurredAt;
    op.partial = false;
  }
  if (
    ["agent.run", "execution.run"].includes(e.operation.capability) &&
    e.operation.attempt >= (a.runAttempt ?? 0)
  ) {
    a.runAttempt = e.operation.attempt;
    if (terminal)
      a.status =
        e.operation.outcome === "succeeded" ? "completed" : e.operation.outcome;
    else if (op.status === "active") a.status = "running";
  }
  if (Object.keys(a.operations).length > 256) {
    const oldest = Object.values(a.operations).find(
      (o) => o.status !== "active" && o.key !== key,
    );
    if (oldest) delete a.operations[oldest.key];
  }
  return s;
}
export type Scene =
  | "city"
  | "workshop"
  | "library"
  | "mcp"
  | "dojo"
  | "dispatch"
  | "meeting";
export interface Visit {
  capability: string;
  keys: string[];
  first: number;
  last: number;
  collection: string;
  evidence: string[];
  destination?: Scene;
  station?: string;
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
  homeX?: number;
  path?: string[];
  roomPath?: string[];
  roomTarget?: string;
  climbing?: boolean;
  packetUntil?: number;
  packetEvidence?: string[];
  completedKeys?: string[];
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
    x:
      [48, 80, 112, 144, 176].find(
        (x) => !Object.values(s.walkers).some((o) => o.homeX === x),
      ) ?? 208,
    y: 160,
    phase: "work",
    age: 0,
    visit: null,
    queued: [],
    visits: 0,
  });
  w.homeX ??= w.x;
  if (
    [
      "agent.handoff",
      "relationship.message",
      "dispatch.task",
      "dispatch.workflow",
    ].includes(ev.operation.capability)
  ) {
    // Async relationships stay at current stations. A packet is evidence, never dialogue.
    w.packetUntil = s.tick + 36;
    w.packetEvidence = [...(w.packetEvidence ?? []), ev.eventId].slice(-12);
    return s;
  }
  if (!destinations[ev.operation.capability]) return s;
  const key = [
    ev.run.namespace,
    ev.run.id,
    ev.operation.id,
    ev.operation.attempt,
  ].join(":");
  if (w.completedKeys?.includes(key)) return s;
  const known = [w.visit, ...w.queued].find((v) => v?.keys.includes(key));
  if (known) {
    known.evidence = [
      ...new Set([...known.evidence, ...ev.evidence.map((r) => r.recordId)]),
    ].slice(-128);
    if (ev.type !== "operation.started" && w.phase === "read") w.age = 0;
    return s;
  }
  const time = ev.occurredAt ?? ev.observedAt;
  const open = [w.visit, ...w.queued].find(
    (v) =>
      v &&
      Math.abs(time - v.first) <= 4000 &&
      v.collection === ev.operation.collection &&
      v.capability === ev.operation.capability &&
      v.station === stationFor(ev.operation),
  );
  if (open) {
    open.keys.push(key);
    open.last = time;
    open.evidence.push(...ev.evidence.map((r) => r.recordId));
  } else {
    w.queued.push({
      capability: ev.operation.capability,
      destination: destinations[ev.operation.capability],
      station: stationFor(ev.operation),
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
export const destinations: Record<string, Scene> = {
  "rag.query": "library",
  "mcp.call": "mcp",
  "evaluation.run": "dojo",
  "dispatch.task": "dispatch",
  "dispatch.workflow": "dispatch",
  "tool.execute": "workshop",
  "artifact.created": "workshop",
  "workcell.execute": "workshop",
};
export function stationFor(op: OperationEvent["operation"]): string {
  if (op.capability === "rag.query") return op.collection;
  if (op.capability === "mcp.call")
    return op.metadata?.approval === "pending"
      ? "approval-pending"
      : "tool-active";
  if (op.capability === "evaluation.run")
    return ["schema", "content", "policy", "skipped"].includes(op.id)
      ? op.id
      : "content";
  if (op.capability === "dispatch.task")
    return (
      (
        {
          queued: "intake",
          assigned: "assignment",
          running: "assignment",
          blocked: "blocked",
          retrying: "retry",
          completed: "completion",
        } as Record<string, string>
      )[op.metadata?.taskState ?? ""] ?? "workflow"
    );
  if (op.capability === "dispatch.workflow") return "workflow";
  return op.capability === "artifact.created"
    ? "evidence-shelf"
    : op.capability === "workcell.execute"
      ? "workcell-bay"
      : "terminal";
}
export const stations: Record<string, number> = Object.fromEntries(
  world.maps.library.objects
    .filter((o) => o.kind === "station")
    .map((o) => [o.id, o.x]),
);
function entrance(scene: Scene): { x: number; y: number } {
  return (
    world.maps.city.objects.find((o) => o.id === scene + "-door") ?? {
      x: 96,
      y: 112,
    }
  );
}
function move(w: Walker, x: number, y: number): boolean {
  const dx = x - w.x,
    dy = y - w.y;
  if (dx) w.x += Math.sign(dx) * Math.min(4, Math.abs(dx));
  else if (dy) w.y += Math.sign(dy) * Math.min(4, Math.abs(dy));
  return w.x === x && w.y === y;
}
function cityPath(w: Walker, from: Scene, to: Scene) {
  delete w.roomPath;
  delete w.roomTarget;
  const a = entrance(from),
    b = entrance(to);
  w.scene = "city";
  w.x = a.x;
  w.y = a.y;
  w.path = route(
    world.graph,
    a.x / 16 + "," + a.y / 16,
    b.x / 16 + "," + b.y / 16,
  ).slice(1);
}
function roomMove(w: Walker, x: number, y: number): boolean {
  const target = `${w.scene}:${x},${y}`;
  if (w.roomTarget !== target) {
    w.roomTarget = target;
    w.roomPath = route(
      world.maps[w.scene].navigation,
      `${w.x},${w.y}`,
      `${x},${y}`,
    ).slice(1);
  }
  const point = w.roomPath?.[0];
  if (!point) return w.x === x && w.y === y;
  const [nx, ny] = point.split(",").map(Number);
  w.climbing = ny !== w.y;
  if (move(w, nx, ny)) w.roomPath!.shift();
  return w.x === x && w.y === y;
}
function followPath(w: Walker): boolean {
  if (!w.path?.length) return true;
  const [x, y] = w.path[0].split(",").map(Number);
  if (move(w, x * 16, y * 16)) w.path.shift();
  // Render the reached doorway for one presentation tick before switching scenes.
  return false;
}
export function advance(p: Presentation, truth?: Truth): Presentation {
  const s = structuredClone(p);
  s.tick++;
  const walkers = Object.values(s.walkers).sort((a, b) =>
    compareId(a.id, b.id),
  );
  for (const w of walkers) {
    w.climbing = false;
    w.age++;
    if (w.phase === "work" && !w.queued.length && w.homeX !== undefined)
      roomMove(w, w.homeX, 160);
    if (w.phase === "work" && w.queued.length && w.age >= 4) {
      w.visit = w.queued.shift()!;
      w.visits++;
      w.age = 0;
      w.phase = w.visit.destination === w.scene ? "enter" : "outbound";
      // Walk to the authored exit before using its reciprocal city portal.
    } else if (w.phase === "outbound") {
      const dest = w.visit?.destination ?? "library";
      if (w.scene !== "city") {
        if (roomMove(w, 16, 160)) cityPath(w, w.scene, dest);
      } else if (followPath(w)) {
        w.scene = dest;
        w.x = 16;
        w.y = 160;
        w.phase = "enter";
        w.age = 0;
      }
    } else if (w.phase === "enter") {
      const objects = world.maps[w.scene].objects;
      const station =
        objects.find(
          (o) => o.kind === "station" && o.id === w.visit?.station,
        ) ?? objects.find((o) => o.kind === "station");
      // Stable, authored slots. Never use roster position (changes as agents arrive).
      const slots = String((station as any)?.slots ?? "0")
        .split(",")
        .map(Number);
      const slot = slots[parseInt(badge(w.id), 16) % slots.length];
      const x = Math.max(16, Math.min(224, (station?.x ?? 128) + slot));
      if (roomMove(w, x, station?.y ?? 160)) {
        w.phase = "read";
        w.age = 0;
      }
    } else if (
      w.phase === "read" &&
      w.age >= 36 &&
      !w.visit?.keys.some(
        (k) => truth?.agents[w.id]?.operations[k]?.status === "active",
      )
    ) {
      w.phase = "return";
      w.age = 0;
    } else if (w.phase === "return") {
      if (w.scene !== "city") {
        if (roomMove(w, 16, 160)) cityPath(w, w.scene, "workshop");
      } else if (followPath(w)) {
        w.scene = "workshop";
        w.x = 16;
        w.y = 160;
        w.phase = "work";
        w.age = 0;
        w.completedKeys = [
          ...(w.completedKeys ?? []),
          ...(w.visit?.keys ?? []),
        ].slice(-256);
        w.visit = null;
      }
    }
  }
  return s;
}
export function compareId(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
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
      (" " + w.visit.capability) +
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
  if (!graph[start] || !graph[end]) return [];
  const metric = (a: string, b: string) => {
    if (!/^-?\d+,-?\d+$/.test(a) || !/^-?\d+,-?\d+$/.test(b)) return 0;
    const [x, y] = a.split(",").map(Number),
      [u, v] = b.split(",").map(Number);
    // Unit graph edge cost; conservative heuristic for arbitrary authored graphs.
    return Math.abs(x - u) + Math.abs(y - v);
  };
  const grid = Object.entries(graph).every(([a, ns]) =>
    ns.every((b) => metric(a, b) <= 1),
  );
  const score: Record<string, number> = { [start]: 0 },
    parent: Record<string, string> = {};
  const open = [start];
  while (open.length) {
    open.sort(
      (a, b) =>
        score[a] +
          (grid ? metric(a, end) : 0) -
          (score[b] + (grid ? metric(b, end) : 0)) || compareId(a, b),
    );
    const n = open.shift()!;
    if (n === end) {
      const path = [n];
      while (parent[path[0]]) path.unshift(parent[path[0]]);
      return path;
    }
    for (const next of [...graph[n]].sort(compareId))
      if (score[next] === undefined || score[n] + 1 < score[next]) {
        score[next] = score[n] + 1;
        parent[next] = n;
        if (!open.includes(next)) open.push(next);
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

export function buildingState(
  scene: Scene,
  truth: Truth,
  now: number,
  transport: string,
) {
  const capabilities = Object.keys(destinations).filter(
    (k) => destinations[k] === scene,
  );
  if (scene === "workshop") capabilities.push("agent.run", "execution.run");
  if (scene === "meeting")
    capabilities.push("agent.handoff", "relationship.message");
  const operations = Object.values(truth.agents).flatMap((a) =>
    Object.values(a.operations)
      .filter((o) => capabilities.includes(o.capability))
      .map((o) => ({ instance: a.id, ...o })),
  );
  const last = Math.max(0, ...operations.map((o) => o.observedAt ?? 0));
  return {
    id: scene,
    operations,
    stations: world.maps[scene].objects
      .filter((o) => o.kind === "station")
      .map((station) => {
        const linked = operations.filter((o) => {
          if (scene === "meeting")
            return (
              station.id ===
              (o.capability === "relationship.message"
                ? "message-evidence"
                : "context-transfer")
            );
          if (["agent.run", "execution.run"].includes(o.capability))
            return station.id === "task-bench";
          return (
            stationFor({
              id: o.operationId ?? "",
              attempt: o.attempt ?? 1,
              capability:
                o.capability as OperationEvent["operation"]["capability"],
              collection:
                o.collection as OperationEvent["operation"]["collection"],
              outcome: "unknown",
              metadata: o.metadata,
            }) === station.id
          );
        });
        return {
          ...station,
          sourceHealth: linked.length
            ? transport === "LIVE"
              ? "OBSERVED"
              : "STALE"
            : "NO LIVE SOURCE",
          operationCount: linked.length,
        };
      }),
    sourceHealth: !operations.length
      ? "NO LIVE SOURCE"
      : transport !== "LIVE"
        ? "STALE"
        : now - last > 30000
          ? operations.some((o) => o.status === "active")
            ? "STALE"
            : "RECENT"
          : "LIVE",
    active: operations.filter((o) => o.status === "active").length,
    failures: operations.filter((o) => o.status === "failed").length,
    completeness: truth.gap ? "partial" : "observed capabilities only",
  };
}
export type Animation =
  | "idle"
  | "walk"
  | "work"
  | "read"
  | "terminal"
  | "talk"
  | "wait"
  | "blocked"
  | "alert"
  | "inspect"
  | "carry"
  | "ladder"
  | "complete"
  | "offline";
export function animationFor(
  w: Walker,
  a: Agent | undefined,
  tick: number,
): Animation {
  if (w.climbing) return "ladder";
  if (["outbound", "enter", "return"].includes(w.phase)) return "walk";
  if (w.packetUntil && tick < w.packetUntil) return "inspect";
  if (w.visit) {
    const ops = w.visit.keys.map((k) => a?.operations[k]);
    if (
      ops.some(
        (o) =>
          o?.metadata?.approval === "pending" ||
          o?.metadata?.taskState === "blocked",
      )
    )
      return "blocked";
    if (ops.some((o) => o?.status === "failed")) return "alert";
    if (w.visit.capability === "workcell.execute")
      // The start seam proves invocation, not that a container passed preflight.
      // A verified completed operation can be shown later as RECENT work.
      return ops.some((o) => o?.status === "succeeded") &&
        !ops.some((o) => o?.status === "active")
        ? "work"
        : "wait";
    if (w.visit.destination === "library") return "read";
    if (w.visit.destination === "mcp") return "terminal";
    if (w.visit.capability === "artifact.created") return "inspect";
    return "work";
  }
  // No inferred offline/presence, speech, carrying or ladder activity.
  return "idle";
}

export function followComplete(
  w: Walker | undefined,
  a: Agent | undefined,
): boolean {
  return (
    !!w &&
    !!a &&
    ["completed", "failed", "canceled", "skipped"].includes(a.status) &&
    w.phase === "work" &&
    !w.queued.length &&
    w.age > 40
  );
}
