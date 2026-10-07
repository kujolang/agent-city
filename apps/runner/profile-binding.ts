import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { ImportedProfile, AgentCatalog } from "./agent-catalog";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export function profileAvailability(profile: ImportedProfile) {
  const modes = ["OBSERVE", "PROPOSE", "ACT"];
  if (
    !modes.includes(profile.permissions.minimum) ||
    !modes.includes(profile.permissions.maximum) ||
    modes.indexOf(profile.permissions.minimum) > 1 ||
    modes.indexOf(profile.permissions.maximum) < 1
  )
    return {
      available: false,
      reason: "This profile does not permit a PROPOSE draft/review run.",
    };
  if (profile.capabilities.required.length)
    return {
      available: false,
      reason: `Required capabilities not connected: ${profile.capabilities.required.join(", ")}`,
    };
  return {
    available: true,
    reason:
      "PROPOSE draft/review only. Declared tools and workflows are not executed; no project mutation or publishing.",
  };
}
export interface ProfileBinding {
  schema: "agent-city.profile-binding.v1";
  adapter: "draft-review/v1";
  mode: "PROPOSE";
  author: ImportedProfile;
  reviewer: ImportedProfile;
}
export function validateBinding(value: unknown): ProfileBinding {
  const binding = value as ProfileBinding;
  if (
    !binding ||
    binding.schema !== "agent-city.profile-binding.v1" ||
    binding.adapter !== "draft-review/v1" ||
    binding.mode !== "PROPOSE"
  )
    throw Error("Invalid profile binding");
  for (const profile of [binding.author, binding.reviewer]) {
    if (
      !profile ||
      !profile.id?.startsWith("kujolang/kujo-agents:") ||
      profile.id !== `kujolang/kujo-agents:${profile.sourceId}` ||
      !profileAvailability(profile).available
    )
      throw Error("Profile permission or required capability is unavailable");
    if (
      typeof profile.contracts?.agent !== "string" ||
      typeof profile.contracts?.skill !== "string" ||
      hash(profile.contracts.agent) !== profile.source.agentHash ||
      hash(profile.contracts.skill) !== profile.source.skillHash
    )
      throw Error("Profile contract checksum mismatch");
  }
  if (Buffer.byteLength(JSON.stringify(binding)) > 128 * 1024)
    throw Error("Selected contracts exceed mission context limit");
  return binding;
}
export async function selectProfiles(file: string, selection: unknown) {
  const picked = selection as { authorId?: string; reviewerId?: string };
  if (
    !picked ||
    typeof picked.authorId !== "string" ||
    typeof picked.reviewerId !== "string"
  )
    throw Error("Select author and reviewer profiles");
  if ((await stat(file)).size > 32 * 1024 * 1024)
    throw Error("Catalog exceeds limit");
  const catalog = JSON.parse(await readFile(file, "utf8")) as AgentCatalog;
  if (catalog.schema !== "agent-city.agent-catalog.v1")
    throw Error("Invalid catalog");
  return validateBinding({
    schema: "agent-city.profile-binding.v1",
    adapter: "draft-review/v1",
    mode: "PROPOSE",
    author: catalog.profiles.find((p) => p.id === picked.authorId),
    reviewer: catalog.profiles.find((p) => p.id === picked.reviewerId),
  });
}
export async function readBinding(file: string) {
  if ((await stat(file)).size > 128 * 1024)
    throw Error("Profile snapshot exceeds limit");
  return validateBinding(JSON.parse(await readFile(file, "utf8")));
}
export function bindingMetadata(binding: ProfileBinding) {
  return {
    adapter: binding.adapter,
    mode: binding.mode,
    author: {
      id: binding.author.id,
      name: binding.author.name,
      contractHash: binding.author.source.agentHash,
    },
    reviewer: {
      id: binding.reviewer.id,
      name: binding.reviewer.name,
      contractHash: binding.reviewer.source.agentHash,
    },
  };
}
