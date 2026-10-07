import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import {
  validateBinding,
  profileAvailability,
  validateProfileMission,
} from "../apps/runner/profile-binding";
import type { ImportedProfile } from "../apps/runner/agent-catalog";
function profile(id: string): ImportedProfile {
  const digest = createHash("sha256").update("contract").digest("hex");
  return {
    id: `kujolang/kujo-agents:${id}`,
    sourceId: id,
    name: id,
    team: "team",
    version: "1",
    permissions: {
      minimum: "OBSERVE",
      maximum: "PROPOSE",
      enforcement: "runtime-adapter",
    },
    capabilities: { required: [], recommended: [], optional: [] },
    tools: { allowed: ["Tool not granted"] },
    workflows: ["not executed"],
    source: {
      repository: "kujolang/kujo-agents",
      path: id,
      manifestHash: digest,
      agentHash: digest,
      skillHash: digest,
    },
    contracts: { agent: "contract", skill: "contract", manifest: {} },
  };
}
const binding = () => ({
  schema: "agent-city.profile-binding.v1",
  adapter: "draft-review/v1",
  mode: "PROPOSE",
  author: profile("author"),
  reviewer: profile("reviewer"),
});
test("draft-review requires permitted PROPOSE mode and every declared required capability", () => {
  const value = binding();
  expect(validateBinding(value).mode).toBe("PROPOSE");
  value.author.capabilities.required = ["filesystem"];
  expect(profileAvailability(value.author).available).toBe(false);
  expect(() => validateBinding(value)).toThrow("unavailable");
  value.author.capabilities.required = [];
  value.author.permissions.minimum = "ACT";
  value.author.permissions.maximum = "ACT";
  expect(() => validateBinding(value)).toThrow("unavailable");
});
test("snapshots reject changed instructions, expanded permission while allowing shared profiles", () => {
  const value = binding();
  value.author.contracts.agent = "changed";
  expect(() => validateBinding(value)).toThrow("checksum");
  const duplicate = binding();
  duplicate.reviewer = duplicate.author;
  expect(validateBinding(duplicate).author.id).toBe(duplicate.reviewer.id);
  const expanded = { ...binding(), mode: "ACT" };
  expect(() => validateBinding(expanded)).toThrow("Invalid");
});

test("documentation needs author permission; platform checks require explicit code scope", () => {
  const value = validateBinding(binding());
  expect(() =>
    validateProfileMission(value, { kind: "writing" }),
  ).not.toThrow();
  for (const flags of [{ useMcpDocs: true }, { useLocalDocs: true }]) {
    expect(() =>
      validateProfileMission(value, { kind: "writing", ...flags }),
    ).toThrow("does not allow");
    value.reviewer.tools.allowed = ["Kujo Docs"];
    expect(() =>
      validateProfileMission(value, { kind: "writing", ...flags }),
    ).toThrow("does not allow");
    value.author.tools.allowed = ["Kujo Docs"];
    expect(() =>
      validateProfileMission(value, { kind: "writing", ...flags }),
    ).not.toThrow();
    value.author.tools.allowed = [];
  }
  value.author.tools.allowed = ["Kujo Docs"];
  expect(() => validateProfileMission(value, { kind: "kujo" })).toThrow(
    "not connected",
  );
  expect(() =>
    validateProfileMission(value, { kind: "code", functionContract: {} }),
  ).not.toThrow();
  expect(() =>
    validateProfileMission(value, { kind: "writing", functionContract: {} }),
  ).toThrow("code mission");
});
