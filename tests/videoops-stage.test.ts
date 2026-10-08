import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import {
  admitVideoopsStage,
  type VideoopsCapabilityEvidence,
} from "../apps/runner/videoops-stage";
import type { ImportedProfile } from "../apps/runner/agent-catalog";
const hash = createHash("sha256").update("fixture contract").digest("hex");
const profile = (): ImportedProfile => ({
  id: "kujolang/kujo-agents:videoops.creative-director",
  sourceId: "videoops.creative-director",
  name: "Fixture",
  team: "videoops",
  version: "1",
  permissions: {
    minimum: "PROPOSE",
    maximum: "PROPOSE",
    enforcement: "runtime-adapter",
  },
  capabilities: {
    required: ["filesystem", "structured-output", "long-context"],
    recommended: [],
    optional: [],
  },
  tools: { allowed: [] },
  workflows: [],
  source: {
    repository: "kujolang/kujo-agents",
    path: "videoops/creative-director",
    manifestHash: hash,
    agentHash: hash,
    skillHash: hash,
  },
  contracts: {
    agent: "fixture contract",
    skill: "fixture contract",
    manifest: {},
  },
});
const evidence: VideoopsCapabilityEvidence[] = [
  "filesystem",
  "structured-output",
  "long-context",
].map((capability) => ({
  capability,
  evidenceRef: "fixture:explicit-runtime-evidence",
  authority: "runtime",
}));
test("VideoOps stage refuses missing capability evidence, mismatched role and changed contracts", () => {
  expect(() =>
    admitVideoopsStage(profile(), "creative-director", evidence),
  ).not.toThrow();
  expect(() =>
    admitVideoopsStage(profile(), "creative-director", evidence.slice(0, 2)),
  ).toThrow("long-context");
  expect(() => admitVideoopsStage(profile(), "video-critic", evidence)).toThrow(
    "Exact",
  );
  const changed = profile();
  changed.contracts.agent += "unrecorded";
  expect(() =>
    admitVideoopsStage(changed, "creative-director", evidence),
  ).toThrow("checksum");
  const act = profile();
  act.permissions.minimum = "ACT";
  expect(() => admitVideoopsStage(act, "creative-director", evidence)).toThrow(
    "PROPOSE",
  );
});
test("a model assertion cannot supply capability authority or arbitrary evidence content", () => {
  expect(() =>
    admitVideoopsStage(profile(), "creative-director", [
      { ...evidence[0], authority: "model" as any },
    ]),
  ).toThrow("evidence");
  expect(() =>
    admitVideoopsStage(profile(), "creative-director", [
      { ...evidence[0], evidenceRef: "raw text\nsecret" },
    ]),
  ).toThrow("evidence");
});
