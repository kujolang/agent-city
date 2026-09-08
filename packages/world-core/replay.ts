import { initialTruth, reduceTruth, type Truth } from "./index";
import type { CityEvent } from "../protocol/index";
export const REPLAY_VERSION = "agent-city.replay.v1";
export const CORE_VERSION = "2";
/** Canonical JSON is independent of object insertion order; arrays retain observed order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export interface ReplayBundle {
  schema: typeof REPLAY_VERSION;
  versions: {
    protocol: string;
    adapter: string;
    core: string;
    map: string;
    coreHash: string;
    mapHash: string;
  };
  workspace: "local-agent-city";
  completeness: string;
  profileBindings: Record<string, string>;
  causalReferences: Array<{ eventId: string; relatedInstance: string }>;
  events: CityEvent[];
  snapshot: Truth;
  checksum: string;
}
/** No IO, time, producer integrations, or presentation side effects. */
export function replay(events: CityEvent[]): Truth {
  let state = initialTruth();
  const identities = new Set<string>();
  for (const e of events) {
    if (e.order <= state.order || identities.has(e.eventId))
      throw Error("Replay order or identity conflict");
    identities.add(e.eventId);
    state = reduceTruth(state, e);
  }
  return state;
}
export function verifyReplay(bundle: ReplayBundle): Truth {
  if (
    bundle.schema !== REPLAY_VERSION ||
    bundle.versions.core !== CORE_VERSION ||
    bundle.versions.protocol !== "1" ||
    bundle.workspace !== "local-agent-city"
  )
    throw Error("Unsupported replay version or workspace");
  const truth = replay(bundle.events);
  if (canonical(truth) !== canonical(bundle.snapshot))
    throw Error("Replay snapshot mismatch");
  return truth;
}
