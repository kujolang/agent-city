import Ajv2020 from "ajv/dist/2020";
import shotSchema from "./videoops-contracts/shot-list.schema.json";
import assetSchema from "./videoops-contracts/asset-manifest.schema.json";
import handoffSchema from "./videoops-contracts/handoff.schema.json";
import provenance from "./videoops-contracts/provenance.json";
import {
  validateVideoopsArtifacts,
  type VideoopsArtifactBundle,
} from "./videoops-artifacts";
const ajv = new Ajv2020({ strict: true, allErrors: false });
const shotCheck = ajv.compile<any>(shotSchema);
const assetCheck = ajv.compile<any>(assetSchema);
const handoffCheck = ajv.compile<any>(handoffSchema);
const id = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && !!v.trim() && v.length <= 8192;
const refs = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= 128 &&
  v.every(id) &&
  new Set(v).size === v.length;
export interface VideoopsTiming {
  fps: number;
  durationSeconds: number;
}
export interface VideoopsRequirement {
  id: string;
  type: string;
  description: string;
  required: boolean;
  used_by: string[];
  preferred_source?: string;
  acceptance?: string;
}
function json(bundle: VideoopsArtifactBundle, path: string) {
  const file = bundle.files.find((f) => f.path === path);
  if (!file) throw Error("Required stage file missing: " + path);
  return JSON.parse(file.content);
}
export function validateVideoopsPlan(value: unknown, timing: VideoopsTiming) {
  const bundle = validateVideoopsArtifacts("creative-director", value);
  if (
    !Number.isFinite(timing.fps) ||
    timing.fps < 1 ||
    timing.fps > 120 ||
    !Number.isFinite(timing.durationSeconds) ||
    timing.durationSeconds <= 0 ||
    timing.durationSeconds > 180
  )
    throw Error("Invalid bounded VideoOps timing");
  const frame = (seconds: number) => {
    const n = seconds * timing.fps;
    if (Math.abs(n - Math.round(n)) > 0.00001)
      throw Error("Shot timing is not frame-aligned");
    return Math.round(n);
  };
  const expected = frame(timing.durationSeconds);
  const shots = json(bundle, "planning/shot-list.json");
  if (!shotCheck(shots) || shots.shots.length > 128)
    throw Error("Upstream shot-list schema failed");
  const plan = json(bundle, "planning/asset-requirements.json");
  if (
    !plan ||
    !Array.isArray(plan.requirements) ||
    plan.requirements.length > 128 ||
    Object.keys(plan).some((k) => k !== "requirements")
  )
    throw Error("Invalid asset requirements");
  const requirements = plan.requirements as VideoopsRequirement[];
  const requirementIds = new Set<string>();
  for (const r of requirements) {
    if (
      !r ||
      !id(r.id) ||
      requirementIds.has(r.id) ||
      !text(r.type) ||
      !text(r.description) ||
      typeof r.required !== "boolean" ||
      !refs(r.used_by) ||
      !r.used_by.length ||
      Object.keys(r).some(
        (k) =>
          ![
            "id",
            "type",
            "description",
            "required",
            "used_by",
            "preferred_source",
            "acceptance",
          ].includes(k),
      ) ||
      (r.preferred_source !== undefined && !text(r.preferred_source)) ||
      (r.acceptance !== undefined && !text(r.acceptance))
    )
      throw Error("Invalid or duplicate asset requirement");
    requirementIds.add(r.id);
  }
  let coverage = 0,
    previousStart = -1;
  const shotIds = new Set<string>();
  for (const shot of shots.shots) {
    if (!id(shot.id) || shotIds.has(shot.id))
      throw Error("Duplicate or invalid shot identity");
    shotIds.add(shot.id);
    const start = frame(shot.start),
      end = frame(shot.end),
      duration = frame(shot.duration);
    if (
      end <= start ||
      end - start !== duration ||
      start < previousStart ||
      start > coverage ||
      end > expected
    )
      throw Error("Shot duration, ordering or timeline coverage mismatch");
    if (start < coverage && !shot.transition_in)
      throw Error("Overlapping shots require an explicit transition");
    coverage = Math.max(coverage, end);
    previousStart = start;
    if (!refs(shot.asset_requirement_ids ?? []) || !refs(shot.asset_ids ?? []))
      throw Error("Invalid shot asset references");
    for (const ref of shot.asset_requirement_ids ?? [])
      if (
        !requirementIds.has(ref) ||
        !requirements.find((r) => r.id === ref)!.used_by.includes(shot.id)
      )
        throw Error("Shot references an unknown or unmapped requirement");
  }
  if (coverage !== expected)
    throw Error("Plan does not cover requested duration");
  for (const r of requirements)
    for (const shot of r.used_by)
      if (
        !shotIds.has(shot) ||
        !shots.shots
          .find((s: any) => s.id === shot)
          .asset_requirement_ids?.includes(r.id)
      )
        throw Error("Requirement mapping must be reciprocal");
  return {
    bundle,
    shots: shots.shots,
    requirements,
    timing,
    gate: {
      schema: "agent-city.videoops-plan-gate.v1",
      status: "passed",
      scope:
        "Schema, frame timing, continuous coverage and reciprocal asset requirements only; creative quality unreviewed",
      schemaSource: provenance,
      frames: expected,
    },
  };
}

/** Actual materialized-file hashes and rights evidence must be supplied by the
 * trusted acquisition adapter. A Scout's JSON cannot approve its own asset. */
export interface VerifiedVideoopsAsset {
  path: string;
  sha256: string;
  rightsEvidence: string;
}
export function validateVideoopsAssets(
  value: unknown,
  plan: ReturnType<typeof validateVideoopsPlan>,
  verified: Record<string, VerifiedVideoopsAsset>,
) {
  const bundle = validateVideoopsArtifacts("asset-scout", value);
  const manifest = json(bundle, "assets/asset-manifest.json");
  if (!assetCheck(manifest) || manifest.assets.length > 128)
    throw Error("Upstream asset-manifest schema failed");
  const seen = new Set<string>(),
    accounted = new Set<string>();
  const blocked: string[] = [],
    generate: string[] = [];
  for (const asset of manifest.assets) {
    const requirement = plan.requirements.find(
      (r) => r.id === asset.requirement_id,
    );
    if (
      !id(asset.id) ||
      seen.has(asset.id) ||
      !requirement ||
      !refs(asset.used_by) ||
      asset.used_by.length !== requirement.used_by.length ||
      asset.used_by.some((s: string) => !requirement.used_by.includes(s))
    )
      throw Error("Invalid asset identity or requirement mapping");
    seen.add(asset.id);
    accounted.add(asset.requirement_id);
    if (asset.status === "NOT_REQUIRED") {
      if (requirement.required)
        throw Error("Required asset cannot be silently omitted");
      continue;
    }
    if (asset.status === "GENERATE") {
      generate.push(asset.requirement_id);
      continue;
    }
    if (asset.status === "BLOCKED") {
      blocked.push(asset.requirement_id);
      continue;
    }
    const actual = verified[asset.id];
    if (
      !actual ||
      !actual.rightsEvidence ||
      !/^[a-f0-9]{64}$/.test(actual.sha256) ||
      !/^assets\/(source|captured|generated|normalized|audio|fonts)\/[a-zA-Z0-9_.\/-]+$/.test(
        actual.path,
      ) ||
      actual.path.split("/").some((p) => p === ".." || p === "." || !p) ||
      asset.path !== actual.path ||
      asset.sha256 !== actual.sha256 ||
      asset.usage_status !== "approved" ||
      asset.acquisition_status !== "resolved"
    )
      throw Error(
        "Resolved asset lacks matching acquired bytes and rights evidence",
      );
  }
  if (plan.requirements.some((r) => !accounted.has(r.id)))
    throw Error("Unaccounted asset requirement");
  for (const shot of plan.shots)
    for (const assetId of shot.asset_ids ?? [])
      if (
        !seen.has(assetId) ||
        !manifest.assets
          .find((a: any) => a.id === assetId)
          .used_by.includes(shot.id)
      )
        throw Error("Shot references missing or unrelated production asset");
  return {
    bundle,
    assets: manifest.assets,
    blocked,
    generate,
    status: blocked.length
      ? "blocked"
      : generate.length
        ? "generation-required"
        : "ready-for-editor",
    scope:
      "Structural/acquisition evidence gate; no generation, render or creative approval inferred",
  };
}
export function validateVideoopsHandoff(
  value: unknown,
  expected: {
    owner: string;
    nextOwner: string;
    artifacts: string[];
    evidence: string[];
  },
) {
  const h = value as any;
  if (
    !handoffCheck(h) ||
    h.current_owner !== expected.owner ||
    h.next_owner !== expected.nextOwner ||
    !text(h.assignment) ||
    !text(h.goal) ||
    !text(h.scope) ||
    !text(h.stop_condition) ||
    h.artifacts.length !== expected.artifacts.length ||
    new Set(h.artifacts).size !== h.artifacts.length ||
    h.artifacts.some((p: string) => !expected.artifacts.includes(p)) ||
    !h.evidence.length ||
    h.evidence.some((p: string) => !expected.evidence.includes(p)) ||
    !h.allowed_next_actions.length
  )
    throw Error("Handoff identity, required context or evidence mismatch");
  return structuredClone(h);
}
