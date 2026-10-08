import { expect, test } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  admitGeneration,
  generateVideoopsMedia,
  validateGenerationRequests,
  validateMediaProvider,
  type GenerationRequest,
  type VideoopsMediaProvider,
  callVideoopsMedia,
} from "../apps/runner/videoops-generation";
import { validateVideoopsMission } from "../apps/runner/videoops-mission";
import {
  validateVideoopsAssets,
  validateVideoopsPlan,
} from "../apps/runner/videoops-gates";
import { videoopsOutputs } from "../apps/runner/videoops-artifacts";

const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const request: GenerationRequest = {
  capability: "speech",
  text: "An explicitly authorized test phrase.",
  durationSeconds: 3,
  maxCredits: 50,
  maxCost: 0,
  authorize: true,
};
function provider(): VideoopsMediaProvider {
  return {
    credential: {
      kind: "env",
      name: "VIDEOOPS_TEST_CREDENTIAL",
      account: null,
    },
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    remainingCredits: 100,
    noOverage: true,
    evidence: "Fixture operator allowance evidence; no account called.",
    rights: "Fixture original script approved for local test.",
    capabilities: {
      speech: {
        model: "test-speech",
        voice: "test-voice",
        entitlementEvidence: "Fixture entitlement only.",
      },
    },
  };
}
function prepared() {
  const id = "generated-speech";
  const plan = validateVideoopsPlan(
    {
      schema: "agent-city.videoops-artifacts.v1",
      files: videoopsOutputs["creative-director"].map((path) => ({
        path,
        content: path.endsWith("shot-list.json")
          ? JSON.stringify({
              shots: [
                {
                  id: "intro",
                  start: 0,
                  end: 3,
                  duration: 3,
                  purpose: "test",
                  visual: "original test",
                  priority: "required",
                  asset_requirement_ids: [id],
                },
              ],
            })
          : path.endsWith("asset-requirements.json")
            ? JSON.stringify({
                requirements: [
                  {
                    id,
                    type: "audio",
                    description: "Authorized phrase",
                    required: true,
                    used_by: ["intro"],
                  },
                ],
              })
            : "Fixture",
      })),
    },
    { fps: 30, durationSeconds: 3 },
  );
  const assets = validateVideoopsAssets(
    {
      schema: "agent-city.videoops-artifacts.v1",
      files: videoopsOutputs["asset-scout"].map((path) => ({
        path,
        content: path.endsWith(".json")
          ? JSON.stringify({
              assets: [
                {
                  id,
                  requirement_id: id,
                  type: "audio",
                  origin: "elevenlabs",
                  status: "GENERATE",
                  usage_status: "pending",
                  acquisition_status: "pending",
                  used_by: ["intro"],
                },
              ],
            })
          : "Fixture",
      })),
    },
    plan,
    {},
  );
  return { plan, assets };
}
async function options() {
  const workspace = await realpath(
    await mkdtemp(join(tmpdir(), "city-generation-")),
  );
  return {
    workspace,
    agentsRepository: workspace,
    run: "test-generation",
    requests: [request],
    provider: provider(),
    ...prepared(),
    verifiedAssets: {},
  };
}

test("generation request and provider admission retain explicit consent, scope and credit bounds", () => {
  expect(validateGenerationRequests(undefined)).toEqual([]);
  expect(validateGenerationRequests([request])).toEqual([request]);
  for (const invalid of [
    [{ ...request, authorize: false }],
    [{ ...request, apiKey: "not-a-real-key" }],
    [{ ...request, maxCredits: Infinity }],
    [{ ...request, durationSeconds: 0 }],
    [request, request],
    [{ ...request, capability: "sound_effects", durationSeconds: 31 }],
    [{ ...request, capability: "music", durationSeconds: 2 }],
  ])
    expect(() => validateGenerationRequests(invalid)).toThrow();
  const validProvider = provider();
  expect(validateMediaProvider(validProvider)).toEqual(validProvider);
  expect(() =>
    validateMediaProvider({ ...provider(), apiKey: "forbidden" }),
  ).toThrow();
  expect(() => admitGeneration([request])).toThrow("private");
  expect(() =>
    admitGeneration([request], {
      ...provider(),
      expiresAt: new Date(0).toISOString(),
    }),
  ).toThrow("current");
  expect(() =>
    admitGeneration([request], { ...provider(), remainingCredits: 49 }),
  ).toThrow("credits");
  expect(() =>
    admitGeneration([{ ...request, capability: "music" }], provider()),
  ).toThrow("no fallback");
});

test("missing or unauthorized Scout requirements stop before any native call", async () => {
  const o = await options();
  let calls = 0;
  const call: typeof callVideoopsMedia = async () => {
    calls++;
    throw Error("not expected");
  };
  try {
    await expect(
      generateVideoopsMedia(
        {
          ...o,
          requests: [{ ...request, capability: "music" }],
          provider: {
            ...provider(),
            capabilities: {
              music: {
                model: "test-music",
                voice: null,
                entitlementEvidence: "fixture",
              },
            },
          },
        },
        call,
      ),
    ).rejects.toThrow("missing from Scout");
    await expect(
      generateVideoopsMedia({ ...o, requests: [] }, call),
    ).rejects.toThrow("outside operator authorization");
    expect(calls).toBe(0);
  } finally {
    await rm(o.workspace, { recursive: true, force: true });
  }
});

test("canonical success gets one exact fingerprint grant and verified original-derived bytes", async () => {
  const o = await options();
  const phases: unknown[] = [],
    calls: string[] = [];
  const bytes = Buffer.from("test derivative, not a real provider recording");
  const fingerprint = hash("native fixture fingerprint");
  const call: typeof callVideoopsMedia = async (
    _repo,
    workspace,
    args,
    credential,
  ) => {
    calls.push(args[0]);
    if (args[0] === "fingerprint") {
      const native = JSON.parse(await readFile(args[2], "utf8"));
      expect(native.provider).toBe("elevenlabs");
      expect(native.attempt).toBe(1);
      expect(native.retry_of).toBe(null);
      expect(
        await readFile(resolve(workspace, native.input.path), "utf8"),
      ).toBe(request.text);
      expect(native.budget.max_credits).toBe(request.maxCredits);
      expect(credential).toBeUndefined();
      return { fingerprint };
    }
    if (args[0] === "authorize") {
      const grant = JSON.parse(await readFile(args[2], "utf8"));
      expect(grant.request_bounds[0].fingerprint).toBe(fingerprint);
      expect(grant.max_calls).toBe(1);
      expect(grant.capabilities).toEqual(["speech"]);
      expect(grant.models).toEqual(["test-speech"]);
      expect(grant.voices).toEqual(["test-voice"]);
      expect(grant.credential_ref).toEqual(o.provider.credential);
      expect(args).toContain("--authorize-local");
      return { state: "AUTHORIZED" };
    }
    expect(credential).toEqual(o.provider.credential);
    await mkdir(join(workspace, "media/generated-speech"), { recursive: true });
    await writeFile(
      join(workspace, "media/generated-speech/normalized.wav"),
      bytes,
    );
    return {
      schema: "videoops-media-result/v1",
      state: "SUCCESS",
      fingerprint,
      asset_id: "generated-speech",
      receipt_path: "media/generated-speech/receipt.json",
      derived: [
        { path: "media/generated-speech/normalized.wav", sha256: hash(bytes) },
      ],
    };
  };
  try {
    const result = await generateVideoopsMedia(
      {
        ...o,
        observe: async (...args) => {
          phases.push(args);
        },
      },
      call,
    );
    expect(calls).toEqual(["fingerprint", "authorize", "generate"]);
    expect(phases).toEqual([
      ["generated-speech", "started", "unset"],
      ["generated-speech", "finished", "succeeded"],
    ]);
    expect(result.assets.status).toBe("ready-for-editor");
    expect(result.verifiedAssets["generated-speech"].sha256).toBe(hash(bytes));
    expect(
      await readFile(
        resolve(o.workspace, result.verifiedAssets["generated-speech"].path),
      ),
    ).toEqual(bytes);
    expect(result.results[0].receipt_path).toBe(
      "media/generated-speech/receipt.json",
    );
  } finally {
    await rm(o.workspace, { recursive: true, force: true });
  }
});

test("unknown canonical outcome has no invented finish and no automatic retry", async () => {
  const o = await options(),
    phases: unknown[] = [],
    calls: string[] = [];
  try {
    await expect(
      generateVideoopsMedia(
        {
          ...o,
          observe: async (...args) => {
            phases.push(args);
          },
        },
        async (_r, _w, args) => {
          calls.push(args[0]);
          return args[0] === "fingerprint"
            ? { fingerprint: hash("request") }
            : args[0] === "authorize"
              ? { state: "AUTHORIZED" }
              : {
                  schema: "videoops-media-result/v1",
                  state: "UNKNOWN_OUTCOME",
                };
        },
      ),
    ).rejects.toThrow("no replacement or automatic retry");
    expect(calls).toEqual(["fingerprint", "authorize", "generate"]);
    expect(phases).toEqual([["generated-speech", "started", "unset"]]);
  } finally {
    await rm(o.workspace, { recursive: true, force: true });
  }
});

test("a SUCCESS receipt with conflicting operation identity cannot emit success", async () => {
  const o = await options(),
    phases: unknown[] = [];
  try {
    await expect(
      generateVideoopsMedia(
        {
          ...o,
          observe: async (...args) => {
            phases.push(args);
          },
        },
        async (_r, _w, args) => {
          return args[0] === "fingerprint"
            ? { fingerprint: hash("expected") }
            : args[0] === "authorize"
              ? { state: "AUTHORIZED" }
              : {
                  schema: "videoops-media-result/v1",
                  state: "SUCCESS",
                  fingerprint: hash("conflicting"),
                  asset_id: "generated-speech",
                };
        },
      ),
    ).rejects.toThrow("no replacement or automatic retry");
    expect(phases).toEqual([["generated-speech", "started", "unset"]]);
  } finally {
    await rm(o.workspace, { recursive: true, force: true });
  }
});

test("mission admission requires displayed provider revision and fitting requested audio before spend", () => {
  const mission = {
    workflow: "videoops",
    prompt: "Test original video",
    width: 640,
    height: 360,
    fps: 30,
    durationSeconds: 3,
    allowRender: true,
    generation: [request],
    mediaProviderRevision: hash("displayed provider fixture"),
  };
  expect(validateVideoopsMission(mission).mediaProviderRevision).toBe(
    mission.mediaProviderRevision,
  );
  expect(() =>
    validateVideoopsMission({
      ...mission,
      generation: [{ ...request, durationSeconds: 4 }],
    }),
  ).toThrow("exceeds the video");
  expect(() =>
    validateVideoopsMission({ ...mission, mediaProviderRevision: undefined }),
  ).toThrow("current provider");
  expect(() =>
    validateVideoopsMission({ ...mission, mediaProviderRevision: "changed" }),
  ).toThrow("current provider");
});

const nativeRepository = resolve(process.cwd(), "../kujo-agents");
test.skipIf(!existsSync(join(nativeRepository, "videoops/tools/bin/videoops")))(
  "real canonical media CLI persists a credential-unavailable block without dispatch or fallback",
  async (context) => {
    const o = await options();
    // A fresh random environment name is never looked up in a credential store.
    // Fail closed if somehow defined. callVideoopsMedia sends only this reference,
    // PATH and LANG; no existing provider credentials reach the native process.
    const credentialName =
      "CITY_TEST_UNSET_ELEVENLABS_" +
      randomUUID().replaceAll("-", "").toUpperCase();
    const phases: unknown[] = [];
    try {
      if (Object.hasOwn(process.env, credentialName)) context.skip();
      let doctor: any;
      try {
        doctor = await callVideoopsMedia(nativeRepository, o.workspace, [
          "doctor",
        ]);
      } catch {
        context.skip();
        return;
      }
      if (!doctor.available) context.skip();
      expect(doctor.offline).toBe(true);
      expect(doctor.authentication).toBe("not_checked");
      await expect(
        generateVideoopsMedia({
          ...o,
          agentsRepository: nativeRepository,
          provider: {
            ...o.provider,
            credential: { kind: "env", name: credentialName, account: null },
          },
          observe: async (...args) => {
            phases.push(args);
          },
        }),
      ).rejects.toThrow("BLOCKED; no replacement or automatic retry");
      const receiptPath = join(
        o.workspace,
        "media/generated-speech/result.json",
      );
      const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
      expect(receipt).toMatchObject({
        schema: "videoops-media-result/v1",
        state: "BLOCKED",
        error: "CREDENTIAL_UNAVAILABLE",
        provider_request_id: null,
        original: null,
        derived: [],
        retries: 0,
        asset_id: "generated-speech",
      });
      expect(
        existsSync(join(o.workspace, ".videoops-media/state.sqlite3")),
      ).toBe(true);
      const status = await callVideoopsMedia(nativeRepository, o.workspace, [
        "status",
        "--request-id",
        "generated-speech",
      ]);
      expect(status).toEqual(receipt);
      expect(phases).toEqual([
        ["generated-speech", "started", "unset"],
        ["generated-speech", "finished", "failed"],
      ]);
      expect(
        existsSync(join(o.workspace, "assets/generated/generated-speech.wav")),
      ).toBe(false);
      const manifest = JSON.parse(
        await readFile(join(o.workspace, "assets/asset-manifest.json"), "utf8"),
      );
      expect(manifest.assets[0].acquisition_status).toBe("blocked");
      expect(manifest.assets[0].media_result).toBe(
        "media/generated-speech/result.json",
      );
    } finally {
      await rm(o.workspace, { recursive: true, force: true });
    }
  },
  30000,
);
