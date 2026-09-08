import type { Animation } from "../world-core/index";
export interface Appearance {
  id: string;
  coat: number;
  accent: number;
  accessory: "cap" | "headset" | "visor";
  overworld: Record<Animation, number[]>;
  sideview: Record<Animation, number[]>;
}
const frames: Record<Animation, number[]> = {
  idle: [0, 0, 1, 0],
  walk: [0, 1, 2, 1],
  work: [0, 1],
  read: [0, 1],
  terminal: [0, 1],
  talk: [0, 1],
  wait: [0],
  blocked: [0, 1],
  alert: [0, 1],
  inspect: [0, 1],
  carry: [0, 1],
  ladder: [0, 1],
  complete: [0, 1],
  offline: [0],
};
const make = (
  id: string,
  coat: number,
  accent: number,
  accessory: Appearance["accessory"],
): Appearance => ({
  id,
  coat,
  accent,
  accessory,
  overworld: frames,
  sideview: frames,
});
export const appearances: Record<string, Appearance> = {
  "city-writer": make("writer-v1", 0x388346, 0xc3d89a, "cap"),
  "city-coder": make("coder-v1", 0xb64b37, 0xeeb371, "headset"),
  "city-reviewer": make("reviewer-v1", 0x784ca9, 0xc4a7f0, "visor"),
  "local-documentation-worker": make("docs-v1", 0x397dcc, 0x65f2d0, "cap"),
  "local-mcp-worker": make("network-v1", 0x6254c7, 0xffc66d, "headset"),
  "local-eval-invocation": make("verify-v1", 0xbd596a, 0x8ddf8b, "visor"),
  "local-workcell-invocation": make("workcell-v1", 0x956d35, 0xffc66d, "visor"),
  unknown: make("unknown-v1", 0x697b95, 0xbbc9dd, "cap"),
};
export function appearance(profile: string) {
  return appearances[profile] ?? appearances.unknown;
}
// Original procedural silhouettes; all semantic pose sets have explicit placeholder frames.
// Pose selection is supplied by pure world-core. Merely owning a pose never claims its activity.
