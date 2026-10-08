import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { boundedCommand } from "./bounded-command";
import {
  validateVideoopsAssets,
  type VerifiedVideoopsAsset,
  type validateVideoopsPlan,
} from "./videoops-gates";

export const mediaCapabilities = ["speech", "music", "sound_effects"] as const;
export type MediaCapability = (typeof mediaCapabilities)[number];
export interface GenerationRequest {
  capability: MediaCapability;
  text: string;
  durationSeconds: number;
  maxCredits: number;
  maxCost: number;
  authorize: true;
}
/** Operator configuration contains references only, never a raw API key. */
export interface VideoopsMediaProvider {
  credential: {
    kind: "keychain" | "secret-service" | "env";
    name: string;
    account: string | null;
  };
  expiresAt: string;
  remainingCredits: number;
  noOverage: true;
  evidence: string;
  rights: string;
  capabilities: Partial<
    Record<
      MediaCapability,
      { model: string; voice: string | null; entitlementEvidence: string }
    >
  >;
}
const nonempty = (v: unknown, limit: number): v is string =>
  typeof v === "string" && !!v.trim() && Buffer.byteLength(v) <= limit;
const only = (v: any, keys: string[]) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const ident = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(v);
export function validateGenerationRequests(
  value: unknown,
): GenerationRequest[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3)
    throw Error("At most three explicitly authorized media requests allowed");
  const seen = new Set<string>();
  for (const r of value) {
    if (
      !only(r, [
        "capability",
        "text",
        "durationSeconds",
        "maxCredits",
        "maxCost",
        "authorize",
      ]) ||
      !mediaCapabilities.includes(r.capability) ||
      seen.has(r.capability) ||
      !nonempty(r.text, 4096) ||
      r.authorize !== true ||
      !Number.isFinite(r.durationSeconds) ||
      r.durationSeconds < (r.capability === "music" ? 3 : 0.5) ||
      r.durationSeconds > (r.capability === "sound_effects" ? 30 : 60) ||
      !Number.isFinite(r.maxCredits) ||
      r.maxCredits <= 0 ||
      r.maxCredits > 100000 ||
      !Number.isFinite(r.maxCost) ||
      r.maxCost < 0 ||
      r.maxCost > 100
    )
      throw Error(
        "Explicit capability, exact text, duration and spending bounds required",
      );
    seen.add(r.capability);
  }
  return structuredClone(value);
}
export function validateMediaProvider(value: unknown): VideoopsMediaProvider {
  const v = value as VideoopsMediaProvider;
  if (
    !only(v, [
      "credential",
      "expiresAt",
      "remainingCredits",
      "noOverage",
      "evidence",
      "rights",
      "capabilities",
    ]) ||
    !only(v.credential, ["kind", "name", "account"]) ||
    !["keychain", "secret-service", "env"].includes(v.credential.kind) ||
    !nonempty(v.credential.name, 128) ||
    (v.credential.kind === "env" &&
      !/^[A-Z][A-Z0-9_]{0,127}$/.test(v.credential.name)) ||
    !(v.credential.account === null || nonempty(v.credential.account, 128)) ||
    !Number.isFinite(Date.parse(v.expiresAt)) ||
    !Number.isFinite(v.remainingCredits) ||
    v.remainingCredits < 0 ||
    v.noOverage !== true ||
    !nonempty(v.evidence, 4096) ||
    !nonempty(v.rights, 4096) ||
    !only(v.capabilities, [...mediaCapabilities]) ||
    !Object.keys(v.capabilities).length
  )
    throw Error(
      "Bounded private media provider configuration and current operator evidence required",
    );
  for (const [capability, c] of Object.entries(v.capabilities)) {
    if (
      !only(c, ["model", "voice", "entitlementEvidence"]) ||
      !ident(c.model) ||
      !(capability === "speech" ? ident(c.voice) : c.voice === null) ||
      !nonempty(c.entitlementEvidence, 4096)
    )
      throw Error(
        "Each media capability needs its own model and entitlement evidence",
      );
  }
  return structuredClone(v);
}
export function mediaProviderRevision(provider: VideoopsMediaProvider) {
  return createHash("sha256")
    .update(JSON.stringify(validateMediaProvider(provider)))
    .digest("hex");
}
export function admitGeneration(
  requests: GenerationRequest[],
  provider?: VideoopsMediaProvider,
  now = Date.now(),
) {
  if (!requests.length) return;
  if (!provider)
    throw Error(
      "Configure a private ElevenLabs credential reference and capability evidence first",
    );
  validateMediaProvider(provider);
  if (
    Date.parse(provider.expiresAt) <= now ||
    Date.parse(provider.expiresAt) > now + 86400000
  )
    throw Error(
      "Media allowance/entitlement evidence must expire within 24 hours and remain current",
    );
  if (requests.some((r) => !provider.capabilities[r.capability]))
    throw Error(
      "Requested media capability has no entitlement evidence; no fallback will be substituted",
    );
  if (
    requests.reduce((s, r) => s + r.maxCredits, 0) > provider.remainingCredits
  )
    throw Error("Requested reservation exceeds evidenced remaining credits");
}
const hash = (bytes: string | Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export async function callVideoopsMedia(
  repo: string,
  workspace: string,
  args: string[],
  credential?: VideoopsMediaProvider["credential"],
) {
  const base = await realpath(repo),
    executable = resolve(base, "videoops/tools/bin/videoops");
  if (
    (await realpath(executable)) !== executable ||
    !(await lstat(executable)).isFile()
  )
    throw Error("Canonical media runtime required");
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    LANG: "C.UTF-8",
    PYTHONNOUSERSITE: "1",
  };
  if (credential?.kind === "env")
    env[credential.name] = process.env[credential.name];
  const outcome = await boundedCommand(
    executable,
    ["media", ...args, "--workspace", workspace],
    { cwd: base, env, timeoutMs: 150000, graceMs: 1000 },
  );
  if (outcome.timedOut)
    throw Error("Media outcome UNKNOWN; do not retry without reconciliation");
  let result: any;
  try {
    result = JSON.parse(outcome.output);
  } catch {
    throw Error(
      "Canonical media receipt unavailable; private runtime details withheld",
    );
  }
  if (outcome.code !== 0 && !result.state)
    throw Error("Canonical media operation blocked; inspect private ledger");
  return result;
}
/** Only the authenticated operator request can grant a provider call. Model output
 * selects neither text, credentials, budget nor retry. The Scout GENERATE entry is
 * required; originals and every native outcome remain in the workspace ledger. */
export async function generateVideoopsMedia(
  options: {
    agentsRepository: string;
    workspace: string;
    run: string;
    requests: GenerationRequest[];
    provider: VideoopsMediaProvider;
    plan: ReturnType<typeof validateVideoopsPlan>;
    assets: ReturnType<typeof validateVideoopsAssets>;
    verifiedAssets: Record<string, VerifiedVideoopsAsset>;
    observe?: (
      id: string,
      phase: "started" | "finished",
      outcome: "unset" | "succeeded" | "failed",
    ) => Promise<void>;
  },
  call = callVideoopsMedia,
) {
  const { provider, workspace } = options;
  const requests = validateGenerationRequests(options.requests);
  admitGeneration(requests, provider);
  const bundle = structuredClone(options.assets.bundle);
  const file = bundle.files.find(
    (f) => f.path === "assets/asset-manifest.json",
  )!;
  const manifest = JSON.parse(file.content);
  // Validate ALL requested assets before any external call.
  for (const r of requests) {
    const id = "generated-" + r.capability;
    const matches = manifest.assets.filter((a: any) => a.id === id);
    if (
      matches.length !== 1 ||
      matches[0].status !== "GENERATE" ||
      matches[0].requirement_id !== id ||
      !options.plan.requirements.some((a) => a.id === id && a.required)
    )
      throw Error(
        "Exact requested generation requirement missing from Scout: " + id,
      );
  }
  if (
    manifest.assets.some(
      (a: any) =>
        a.status === "GENERATE" &&
        !requests.some((r) => a.id === "generated-" + r.capability),
    )
  )
    throw Error("Scout requested media outside operator authorization");
  await mkdir(resolve(workspace, "assets"), { recursive: true, mode: 0o700 });
  await writeFile(
    resolve(workspace, "assets/asset-manifest.json"),
    file.content,
    { flag: "wx", mode: 0o600 },
  );
  const save = async (path: string, content: string | Buffer) => {
    await mkdir(dirname(resolve(workspace, path)), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(resolve(workspace, path), content, {
      flag: "wx",
      mode: 0o600,
    });
    return { path, sha256: hash(content) };
  };
  const evidence = await save(
    "media-input/operator-evidence.json",
    JSON.stringify({
      evidence: provider.evidence,
      rights: provider.rights,
      capabilities: provider.capabilities,
      requests,
    }),
  );
  const verified = { ...options.verifiedAssets };
  const results = [];
  for (const r of requests) {
    const id = "generated-" + r.capability,
      asset = manifest.assets.find((a: any) => a.id === id),
      c = provider.capabilities[r.capability]!;
    const input = await save("media-input/" + id + ".txt", r.text);
    const request = {
      schema: "videoops-media-request/v1",
      request_id: id,
      job_id: options.run,
      asset_id: id,
      requirement_id: id,
      shot_ids: asset.used_by,
      capability: r.capability,
      provider: "elevenlabs",
      model: c.model,
      voice: c.voice,
      settings: r.capability === "music" ? { force_instrumental: true } : {},
      input,
      language: null,
      target_duration_seconds: r.durationSeconds,
      output_format: "mp3_44100_128",
      alignment: "none",
      authorization_id: "city-" + r.capability,
      budget: {
        max_credits: r.maxCredits,
        max_cost: r.maxCost,
        currency: "USD",
        estimate_evidence: evidence,
      },
      attempt: 1,
      retry_of: null,
      rights: {
        evidence,
        license: provider.rights,
        attribution: null,
        restrictions: [],
        intended_use: "Local video production for operator review",
      },
    };
    const requestFile = await save(
      "media-input/" + id + ".json",
      JSON.stringify(request),
    );
    const fingerprint = await call(options.agentsRepository, workspace, [
      "fingerprint",
      "--request",
      resolve(workspace, requestFile.path),
    ]);
    if (!/^[a-f0-9]{64}$/.test(fingerprint.fingerprint))
      throw Error("Native request fingerprint unavailable");
    const authorization = {
      schema: "videoops-media-authorization/v1",
      authorization_id: request.authorization_id,
      workspace,
      provider: "elevenlabs",
      capabilities: [r.capability],
      models: [c.model],
      voices: c.voice ? [c.voice] : [],
      output_formats: [request.output_format],
      request_bounds: [
        {
          fingerprint: fingerprint.fingerprint,
          max_credits: r.maxCredits,
          max_cost: r.maxCost,
          evidence,
        },
      ],
      max_calls: 1,
      max_credits: r.maxCredits,
      max_cost: r.maxCost,
      currency: "USD",
      expires_at: provider.expiresAt,
      credential_ref: provider.credential,
      entitlements: [
        {
          capability: r.capability,
          allowed: true,
          expires_at: provider.expiresAt,
          evidence,
          remaining_credits: provider.remainingCredits,
          no_overage: true,
        },
      ],
    };
    const grant = await save(
      "media-input/" + id + "-authorization.json",
      JSON.stringify(authorization),
    );
    await call(options.agentsRepository, workspace, [
      "authorize",
      "--authorization",
      resolve(workspace, grant.path),
      "--authorize-local",
    ]);
    await options.observe?.(id, "started", "unset");
    const result = await call(
      options.agentsRepository,
      workspace,
      ["generate", "--request", resolve(workspace, requestFile.path)],
      provider.credential,
    );
    results.push(result);
    if (
      result.schema === "videoops-media-result/v1" &&
      result.fingerprint === fingerprint.fingerprint &&
      result.asset_id === id &&
      ["FAILED", "BLOCKED", "UNSUPPORTED", "CANCELLED"].includes(result.state)
    )
      await options.observe?.(id, "finished", "failed");
    if (
      result.schema !== "videoops-media-result/v1" ||
      result.state !== "SUCCESS" ||
      result.fingerprint !== fingerprint.fingerprint ||
      result.asset_id !== id
    )
      throw Error(
        "Media " +
          id +
          ": " +
          (result.state || "UNKNOWN_OUTCOME") +
          "; no replacement or automatic retry",
      );
    const derivative = result.derived.find(
      (d: any) => d.path === "media/" + id + "/normalized.wav",
    );
    if (!derivative || !/^[a-f0-9]{64}$/.test(derivative.sha256))
      throw Error("Native normalized audio unavailable");
    const source = resolve(workspace, derivative.path),
      info = await lstat(source);
    if (
      !info.isFile() ||
      (await realpath(source)) !== source ||
      info.size > 16777216
    )
      throw Error("Bounded native media required");
    const bytes = await readFile(source);
    if (hash(bytes) !== derivative.sha256) throw Error("Native media changed");
    const copied = await save("assets/generated/" + id + ".wav", bytes);
    verified[id] = {
      ...copied,
      rightsEvidence: evidence.path + "#" + evidence.sha256,
    };
    await options.observe?.(id, "finished", "succeeded");
    Object.assign(asset, {
      status: "FOUND",
      path: copied.path,
      sha256: copied.sha256,
      usage_status: "approved",
      acquisition_status: "resolved",
      media_result: result.receipt_path,
    });
  }
  file.content = JSON.stringify(manifest);
  const assets = validateVideoopsAssets(bundle, options.plan, verified);
  await save("media-input/resolved-manifest.json", file.content);
  return { assets, verifiedAssets: verified, results };
}
