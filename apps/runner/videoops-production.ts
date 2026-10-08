import { createHash } from "node:crypto";
import {
  probeVideoopsMediaDuration,
  inspectVideoopsAudio,
  validateVideoopsMixPlan,
  type VideoopsAudioSource,
} from "./videoops-audio-qa";
import {
  generateVideoopsMedia,
  type GenerationRequest,
  type VideoopsMediaProvider,
} from "./videoops-generation";
import { checkObserver } from "./check-observer";
import { inspectVideoopsMedia } from "./videoops-media-transfer";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prepareVideoops } from "./videoops-preparation";
import { admitVideoopsStage, runVideoopsStage } from "./videoops-stage";
import { readVideoopsAttempt } from "./videoops-artifacts";
import { renderVideoopsAttempt } from "./videoops-render";
import { submitVideoopsReview } from "./videoops-review";
import { validateVideoopsHandoff } from "./videoops-gates";
import { validateVideoopsRenderInput } from "./videoops-render-input";
import type { ImportedProfile } from "./agent-catalog";

export const videoopsEditorInstructions =
  "Author the required HTML composition and production notes from the supplied exact plan. Do not alter transcript or shot timing. Runtime supplies ./gsap.min.js (GSAP 3.13.0) and HyperFrames 0.8.141. Use only supplied acquired assets at ./assets/... paths matching the manifest. No remote URLs, unprovided media, packages or network access. For generic system monospace use font-family: monospace; do not list named OS fonts that the offline renderer cannot provide. Other fonts require supplied local files and matching @font-face declarations. Give timed clips stable IDs. Use a root with data-composition-id, data-width, data-height, data-duration. Timed .clip elements require data-start, data-duration, data-track-index. Set window.__timelines[id] to a paused GSAP timeline, where id EXACTLY equals a data-composition-id in that HTML file, not an ordinary element/clip id. Prefer one root composition timeline that animates the child elements; do not register separate clip timelines unless each has its own matching data-composition-id. Example: root data-composition-id='city' uses window.__timelines['city']. Keep the timeline duration equal to the requested duration, including any final hold; no wall-clock timers or CSS animations. Animate content inside clips, not clip timing or visibility. NEVER use GSAP autoAlpha, visibility or display on a .clip element; HyperFrames owns clip visibility. Let data-start/data-duration make hard scene cuts. Animate a nested content element only. Do not claim rendering, approval or final.mp4. Runtime handles technical checks and exact-candidate independent review separately.";

type PreparationOptions = Parameters<typeof prepareVideoops>[0];
/** Preparation → real SDK Editor → offline renderer → native review ledger.
 * Acquired media must match trusted runtime hashes and rights references.
 * Unresolved acquisition/generation blocks before Editor work.
 * A pending review is an output state, never a completed production claim. */
export async function produceVideoops(
  options: PreparationOptions & {
    audioAssets?: Record<
      string,
      { role: VideoopsAudioSource["role"]; durationSeconds?: number }
    >;
    generation?: GenerationRequest[];
    mediaProvider?: VideoopsMediaProvider;
    editor: ImportedProfile;
    editorCapabilities: Parameters<typeof runVideoopsStage>[0]["capabilities"];
    agentsRepository: string;
    image: string;
    dockerContext?: string;
    width: number;
    height: number;
    mandatoryReview: ("visual_playback" | "audio_listening")[];
  },
  dependencies = {
    prepare: prepareVideoops,
    stage: runVideoopsStage,
    render: renderVideoopsAttempt,
    review: submitVideoopsReview,
  },
) {
  admitVideoopsStage(
    options.editor,
    "hyperframes-editor",
    options.editorCapabilities,
  );
  if (!/^sha256:[a-f0-9]{64}$/.test(options.image))
    throw Error("Immutable render image required before production");
  // Validate resource bounds before any model spend, using no generated work.
  validateVideoopsRenderInput({
    schema: "agent-city.videoops-render-input.v1",
    width: options.width,
    height: options.height,
    ...options.timing,
    composition: {
      schema: "agent-city.videoops-artifacts.v1",
      files: [
        {
          path: "production/hyperframes/index.html",
          content: "resource admission",
        },
        {
          path: "production/production-notes.md",
          content: "resource admission",
        },
      ],
    },
  });
  if (
    !options.mandatoryReview.length ||
    new Set(options.mandatoryReview).size !== options.mandatoryReview.length ||
    options.mandatoryReview.some(
      (c) => !["visual_playback", "audio_listening"].includes(c),
    )
  )
    throw Error("Explicit review requirements required");
  const directory = resolve(options.workspace, ".city-production");
  await mkdir(directory, { mode: 0o700 });
  const save = async (result: Record<string, unknown> & { status: string }) => {
    const receipt: Record<string, unknown> & {
      status: string;
      productionApproval: string;
    } = { ...result, productionApproval: "NOT_ESTABLISHED" };
    await writeFile(
      resolve(directory, "result.json"),
      JSON.stringify(receipt, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    return receipt;
  };
  try {
    const prepared = await dependencies.prepare(options);
    if (
      prepared.status === "generation-required" &&
      prepared.plan &&
      prepared.assets &&
      options.generation?.length &&
      options.mediaProvider
    ) {
      const observe = checkObserver(
        options.spool,
        options.producer,
        options.run + "-media-generator",
        options.task,
        {
          agent: "media-generator",
          profile: "city-videoops-media-runtime",
          tool: "videoops.media.generate",
        },
      );
      const generated = await generateVideoopsMedia({
        agentsRepository: options.agentsRepository,
        workspace: options.workspace,
        run: options.run,
        requests: options.generation,
        provider: options.mediaProvider,
        plan: prepared.plan,
        assets: prepared.assets,
        verifiedAssets: options.verifiedAssets,
        observe: (id, phase, outcome) =>
          observe(id, "execution", phase, outcome),
      });
      prepared.assets = generated.assets;
      prepared.status = generated.assets.status;
      options = { ...options, verifiedAssets: generated.verifiedAssets };
    }
    if (
      prepared.status !== "ready-for-editor" ||
      !("plan" in prepared) ||
      !prepared.assets
    )
      return await save({
        status: "blocked",
        stage: prepared.stage,
        reason: "Preparation is not ready for Editor",
        preparation: prepared,
        uncertain: prepared.attempts.some((a) => a.uncertain),
      });
    for (const required of options.requiredMedia ?? []) {
      const asset = prepared.assets.assets.find(
        (a: any) => a.id === required.id,
      );
      if (!asset || !["FOUND", "CAPTURED"].includes(asset.status))
        throw Error("Required supplied media missing: " + required.id);
    }
    const media = prepared.assets.assets
      .filter((asset: any) => asset.status !== "NOT_REQUIRED")
      .map((asset: any) => {
        const actual = options.verifiedAssets[asset.id];
        if (!actual) throw Error("Acquired media receipt unavailable");
        return actual;
      });
    await inspectVideoopsMedia(options.workspace, media);
    for (const [id, audio] of Object.entries(options.audioAssets ?? {})) {
      const ref = options.verifiedAssets[id];
      if (!ref) throw Error("Required audio source unavailable");
      const path = resolve(options.workspace, ref.path),
        bytes = (await stat(path)).size;
      const actual = await probeVideoopsMediaDuration({
        path,
        bytes,
        sha256: ref.sha256,
      });
      if (!actual.audioPresent)
        throw Error("Required audio source has no audio stream");
      if (
        audio.role === "voice" &&
        actual.durationSeconds > options.timing.durationSeconds + 0.1
      )
        throw Error(
          "Complete generated narration cannot fit video; no truncation or automatic regeneration",
        );
      audio.durationSeconds = actual.durationSeconds;
    }

    const owner =
      options.producer + ":" + options.run + "-asset-scout:asset-scout";
    const nextOwner =
      options.producer +
      ":" +
      options.run +
      "-hyperframes-editor:hyperframes-editor";
    const handoff = {
      schema: "kujo.handoff/v1",
      assignment: options.task,
      current_owner: owner,
      next_owner: nextOwner,
      goal: "Render the validated original composition without changing copy or timing",
      scope:
        "Offline composition with verified acquired media; no acquisition or publication",
      artifacts: [
        ...prepared.plan.bundle.files,
        ...prepared.assets.bundle.files,
      ].map((f) => f.path),
      evidence: ["gate:asset-scout:ready-for-editor"],
      decisions: [
        "Structural gates passed; creative/perceptual approval remains pending",
      ],
      unresolved_questions: [],
      allowed_next_actions: ["author-composition", "isolated-render"],
      stop_condition: "Exact rendered candidate ready for independent review",
    };
    validateVideoopsHandoff(handoff, {
      owner,
      nextOwner,
      artifacts: handoff.artifacts,
      evidence: handoff.evidence,
    });
    await writeFile(
      resolve(directory, "scout-to-editor.json"),
      JSON.stringify(handoff, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    async function observe(phase: "started" | "finished", outcome: string) {
      try {
        const line =
          JSON.stringify({
            schema: "kujo.lifecycle.v1",
            producer_instance: options.producer,
            profile: options.scout.id,
            run_id: options.run + "-asset-scout",
            agent_id: "asset-scout",
            task_id: options.task,
            operation_id: "handoff-hyperframes-editor",
            attempt: prepared.attempts
              .filter((a) => a.stage === "asset-scout")
              .at(-1)!.attempt,
            kind: "internal",
            capability: "agent.handoff",
            phase,
            outcome,
            occurred_at_ms: Date.now(),
            metadata: { relatedInstance: nextOwner },
          }) + "\n";
        if (
          (await stat(options.spool).catch(() => ({ size: 0 }))).size +
            Buffer.byteLength(line) >
          262144
        )
          throw Error("Observation quota");
        await appendFile(options.spool, line);
      } catch {
        await writeFile(
          options.spool + ".gap",
          "VideoOps production handoff observation incomplete",
          { mode: 0o600 },
        ).catch(() => {});
      }
    }
    await observe("started", "unset");
    let stage: Awaited<ReturnType<typeof runVideoopsStage>> | null = null;
    const attempts = [];
    let repair = "";
    let mix: ReturnType<typeof validateVideoopsMixPlan> = [];
    for (let attempt = 1; attempt <= 2; attempt++) {
      stage = await dependencies.stage({
        ...options,
        stage: "hyperframes-editor",
        attempt,
        profile: options.editor,
        capabilities: options.editorCapabilities,
        run: options.run + "-hyperframes-editor",
        instructions:
          videoopsEditorInstructions +
          (Object.keys(options.audioAssets ?? {}).length
            ? ' Audio is required. Place local <audio id="voice" src="assets/..." data-start="0.25" data-duration="3.52" data-track-index="2" data-volume="0.8"></audio> elements inside root; use real provided durations, no autoplay JS. Use separate tracks. Keep music gain <=0.25 under narration (a conservative constant attenuation is acceptable). Also write production/hyperframes/mix-plan.json exactly {"schema":"agent-city.videoops-mix.v1","clips":[{"assetId":"provided-id","role":"voice|music|sfx","startSeconds":0,"durationSeconds":3,"gain":0.8}]}. Every required audio asset appears once; durations must fit timeline and match HTML; use exact role from audioAssets. Do not truncate narration. Preserve source bytes. Human listening is required.'
            : ""),
        input: JSON.stringify({
          handoff,
          intake: options.intake,
          planning: prepared.plan.bundle,
          assets: prepared.assets.bundle,
          width: options.width,
          height: options.height,
          timing: options.timing,
          repair,
          audioAssets: options.audioAssets ?? {},
        }),
      });
      try {
        if (stage.receipt.status !== "artifacts-stored" || !stage.artifact)
          throw Error(stage.receipt.reason || "Editor output unavailable");
        const composition = await readVideoopsAttempt(stage.artifact);
        validateVideoopsRenderInput({
          schema: "agent-city.videoops-render-input.v1",
          composition,
          width: options.width,
          height: options.height,
          ...options.timing,
        });
        const authored = composition.files.map((f) => f.content).join("\n");
        for (const required of options.requiredMedia ?? []) {
          if (!authored.includes(options.verifiedAssets[required.id].path))
            throw Error(
              "Composition omits required media reference: " + required.id,
            );
        }
        if (Object.keys(options.audioAssets ?? {}).length)
          mix = validateVideoopsMixPlan(
            composition,
            options.audioAssets!,
            options.timing.durationSeconds,
          );
        attempts.push({ attempt, status: "passed" });
        break;
      } catch (error) {
        repair = (
          error instanceof Error ? error.message : "Editor contract failed"
        ).slice(0, 1024);
        attempts.push({ attempt, status: "failed", reason: repair });
        if (stage.receipt.timedOut || stage.receipt.code !== 0) break;
        stage = null;
      }
    }
    await observe("finished", stage?.artifact ? "succeeded" : "failed");
    if (!stage?.artifact || attempts.at(-1)?.status !== "passed")
      return await save({
        status: "blocked",
        stage: "hyperframes-editor",
        attempts,
        uncertain:
          !!stage && (stage.receipt.timedOut || stage.receipt.code !== 0),
      });
    const candidate = await dependencies.render({
      root: options.root,
      runtime: resolve(directory, "render-1"),
      image: options.image,
      dockerContext: options.dockerContext,
      producer: options.producer,
      run: options.run + "-render",
      task: options.task,
      spool: options.spool,
      editor: stage.artifact,
      media,
      mediaRoot: options.workspace,
      width: options.width,
      height: options.height,
      ...options.timing,
    });
    let audioQa = null;
    if (mix.length) {
      const provenancePath = resolve(directory, "audio-provenance.json");
      const provenance = Buffer.from(
        JSON.stringify({
          schema: "agent-city.videoops-audio-provenance.v1",
          assets: options.verifiedAssets,
          scope:
            "Actual transferred hashes and operator rights evidence; no new provider generation claim for imported audio",
        }),
      );
      await writeFile(provenancePath, provenance, { mode: 0o600, flag: "wx" });
      const receipt = {
        path: provenancePath,
        bytes: provenance.length,
        sha256: createHash("sha256").update(provenance).digest("hex"),
      };
      const sources = await Promise.all(
        mix.map(async (clip) => {
          const ref = options.verifiedAssets[clip.assetId];
          return {
            ...ref,
            path: resolve(options.workspace, ref.path),
            bytes: (await stat(resolve(options.workspace, ref.path))).size,
            receipt,
            role: clip.role,
            startSeconds: clip.startSeconds,
            durationSeconds: clip.durationSeconds,
            gain: clip.gain,
          };
        }),
      );
      audioQa = await inspectVideoopsAudio({
        agentsRepository: options.agentsRepository,
        workspace: resolve(directory, "audio-qa"),
        candidate: {
          path: resolve(candidate.directory, candidate.candidate.name),
          sha256: candidate.candidate.sha256,
          bytes: candidate.candidate.bytes,
        },
        durationSeconds: options.timing.durationSeconds,
        sources,
      });
      if (!audioQa.passed)
        return await save({
          status: "blocked",
          stage: "audio-qa",
          candidate,
          audioQa,
          uncertain: false,
        });
    }
    const review = await dependencies.review({
      agentsRepository: options.agentsRepository,
      workspace: resolve(directory, "review-1"),
      candidate,
      ...(audioQa ? { audioQa } : {}),
      mandatoryCapabilities: mix.length
        ? [...new Set([...options.mandatoryReview, "audio_listening" as const])]
        : options.mandatoryReview,
    });
    return await save({
      status: "review-pending",
      stage: "independent-review",
      attempts,
      candidate,
      audioQa,
      review,
    });
  } catch (error) {
    return await save({
      status: "blocked",
      stage: "production",
      reason: error instanceof Error ? error.message : "Production failed",
      uncertain: true,
    });
  }
}
