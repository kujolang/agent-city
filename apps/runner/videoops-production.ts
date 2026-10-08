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

type PreparationOptions = Parameters<typeof prepareVideoops>[0];
/** Preparation → real SDK Editor → offline renderer → native review ledger.
 * Current transport admits original text/vector compositions only. Requested
 * external media blocks explicitly until the acquisition transport is connected.
 * A pending review is an output state, never a completed production claim. */
export async function produceVideoops(
  options: PreparationOptions & {
    editor: ImportedProfile;
    editorCapabilities: Parameters<typeof runVideoopsStage>[0]["capabilities"];
    agentsRepository: string;
    image: string;
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
    const receipt = { ...result, productionApproval: "NOT_ESTABLISHED" };
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
      prepared.status !== "ready-for-editor" ||
      !("plan" in prepared) ||
      !prepared.assets
    )
      return await save({
        status: "blocked",
        stage: prepared.stage,
        reason: "Preparation is not ready for Editor",
        preparation: prepared,
      });
    if (prepared.assets.assets.some((a: any) => a.status !== "NOT_REQUIRED"))
      return await save({
        status: "blocked",
        stage: "media-transport",
        reason:
          "Acquired media transfer into render Workcell is not connected; no substitution permitted",
        preparation: prepared,
      });
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
      scope: "Offline text/vector composition; no acquisition or publication",
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
    for (let attempt = 1; attempt <= 2; attempt++) {
      stage = await dependencies.stage({
        ...options,
        stage: "hyperframes-editor",
        attempt,
        profile: options.editor,
        capabilities: options.editorCapabilities,
        run: options.run + "-hyperframes-editor",
        instructions:
          "Author the required HTML composition and production notes from the supplied exact plan. Do not alter transcript or shot timing. Runtime supplies ./gsap.min.js (GSAP 3.13.0) and HyperFrames 0.8.141. No external fonts, URLs, assets, packages or network access. Use a root with data-composition-id, data-width, data-height, data-duration. Timed .clip elements require data-start, data-duration, data-track-index. Set window.__timelines[id] to a paused GSAP timeline; no wall-clock timers or CSS animations. Animate content inside clips, not clip timing. Do not claim rendering, approval or final.mp4. Runtime handles technical checks and exact-candidate independent review separately.",
        input: JSON.stringify({
          handoff,
          intake: options.intake,
          planning: prepared.plan.bundle,
          assets: prepared.assets.bundle,
          width: options.width,
          height: options.height,
          timing: options.timing,
          repair,
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
      });
    const candidate = await dependencies.render({
      root: options.root,
      runtime: resolve(directory, "render-1"),
      image: options.image,
      producer: options.producer,
      run: options.run + "-render",
      task: options.task,
      spool: options.spool,
      editor: stage.artifact,
      width: options.width,
      height: options.height,
      ...options.timing,
    });
    const review = await dependencies.review({
      agentsRepository: options.agentsRepository,
      workspace: resolve(directory, "review-1"),
      candidate,
      mandatoryCapabilities: options.mandatoryReview,
    });
    return await save({
      status: "review-pending",
      stage: "independent-review",
      attempts,
      candidate,
      review,
    });
  } catch (error) {
    return await save({
      status: "blocked",
      stage: "production",
      reason: error instanceof Error ? error.message : "Production failed",
    });
  }
}
