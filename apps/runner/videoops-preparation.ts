import {
  appendFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { admitVideoopsStage, runVideoopsStage } from "./videoops-stage";
import {
  validateVideoopsArtifacts,
  videoopsOutputs,
} from "./videoops-artifacts";
import {
  validateVideoopsPlan,
  validateVideoopsAssets,
  validateVideoopsHandoff,
  type VideoopsTiming,
  type VerifiedVideoopsAsset,
} from "./videoops-gates";
import shotSchema from "./videoops-contracts/shot-list.schema.json";
import assetSchema from "./videoops-contracts/asset-manifest.schema.json";
import { checkObserver } from "./check-observer";
import type { ImportedProfile } from "./agent-catalog";

type StageOptions = Parameters<typeof runVideoopsStage>[0];
type StageResult = Awaited<ReturnType<typeof runVideoopsStage>>;
const intakePaths = [
  "project-brief.md",
  "messaging.md",
  "audience.md",
  "constraints.md",
  "references.md",
  "platform.json",
].map((p) => "intake/" + p);

/** Recheck materialized bytes before a later role consumes a stored attempt. */
async function readArtifacts(result: StageResult) {
  if (!result.artifact) throw Error("Stored artifacts unavailable");
  const { directory, receipt } = result.artifact;
  const root = await realpath(directory);
  const files = [];
  for (const ref of receipt.artifacts) {
    const file = resolve(root, ref.path);
    if (
      (await realpath(file)) !== file ||
      !(await lstat(file)).isFile() ||
      (await stat(file)).size !== ref.bytes
    )
      throw Error("Stored stage artifact changed");
    const content = await readFile(file, "utf8");
    if (createHash("sha256").update(content).digest("hex") !== ref.sha256)
      throw Error("Stored stage artifact checksum changed");
    files.push({ path: ref.path, content });
  }
  return validateVideoopsArtifacts(receipt.stage, {
    schema: "agent-city.videoops-artifacts.v1",
    files,
  });
}

/** Preparation portion of production, never a final-video completion claim.
 * Only verified planning can reach Scout. Each failed economical attempt is
 * retained; the runtime never escalates to another model without configuration. */
export async function prepareVideoops(
  options: Omit<
    StageOptions,
    "stage" | "attempt" | "profile" | "capabilities" | "instructions" | "input"
  > & {
    planner: ImportedProfile;
    scout: ImportedProfile;
    capabilities: {
      planner: StageOptions["capabilities"];
      scout: StageOptions["capabilities"];
    };
    intake: { path: string; content: string }[];
    timing: VideoopsTiming;
    verifiedAssets: Record<string, VerifiedVideoopsAsset>;
  },
  execute = runVideoopsStage,
) {
  if (
    options.intake.length !== intakePaths.length ||
    new Set(options.intake.map((f) => f.path)).size !== intakePaths.length ||
    options.intake.some(
      (f) =>
        !intakePaths.includes(f.path) ||
        !f.content.trim() ||
        Buffer.byteLength(f.content) > 16384,
    )
  )
    throw Error("Complete bounded VideoOps intake required");
  const platform = JSON.parse(
    options.intake.find((f) => f.path === "intake/platform.json")!.content,
  );
  if (
    platform.target_duration_seconds !== options.timing.durationSeconds ||
    platform.fps !== options.timing.fps
  )
    throw Error("Platform and explicit timing disagree");
  admitVideoopsStage(
    options.planner,
    "creative-director",
    options.capabilities.planner,
  );
  admitVideoopsStage(options.scout, "asset-scout", options.capabilities.scout);
  const workspace = await realpath(options.workspace);
  // A preparation invocation cannot overwrite its intake or silently repeat work.
  const receipts = resolve(workspace, ".city-preparation");
  await mkdir(receipts, { mode: 0o700 });
  await writeFile(
    resolve(receipts, "intake.json"),
    JSON.stringify(options.intake),
    { mode: 0o600, flag: "wx" },
  );
  const observe = checkObserver(
    options.spool,
    options.producer,
    options.run,
    options.task,
    {
      agent: "videoops-gate",
      profile: "city-videoops-checker",
      tool: "city.videoops-stage-gate",
    },
  );
  const results: {
    stage: string;
    attempt: number;
    status: string;
    reason?: string;
  }[] = [];
  async function stage<T>(
    name: "creative-director" | "asset-scout",
    profile: ImportedProfile,
    capabilities: StageOptions["capabilities"],
    instructions: string,
    input: string,
    check: (bundle: any) => T,
  ) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const last = results.at(-1);
      const result = await execute({
        ...options,
        workspace,
        stage: name,
        attempt,
        profile,
        capabilities,
        run: options.run + "-" + name,
        instructions,
        input:
          input +
          (last?.stage === name
            ? "\nPrevious attempt failed: " +
              last.reason +
              ". Repair only this stage."
            : ""),
      });
      const operation = name + "-handoff-gate-" + attempt;
      await observe(operation, "evaluation", "started", "unset");
      try {
        if (result.receipt.status !== "artifacts-stored")
          throw Error(result.receipt.reason || "Stage output unavailable");
        const checked = check(await readArtifacts(result));
        results.push({ stage: name, attempt, status: "passed" });
        await writeFile(
          resolve(receipts, name + "-" + attempt + ".json"),
          JSON.stringify({ status: "passed", gate: checked }),
          { mode: 0o600, flag: "wx" },
        );
        await observe(operation, "evaluation", "finished", "succeeded");
        return { checked, result };
      } catch (error) {
        const reason = (
          error instanceof Error ? error.message : "Stage gate failed"
        ).slice(0, 1024);
        results.push({ stage: name, attempt, status: "failed", reason });
        await writeFile(
          resolve(receipts, name + "-" + attempt + ".json"),
          JSON.stringify(results.at(-1)),
          { mode: 0o600, flag: "wx" },
        );
        await observe(operation, "evaluation", "finished", "failed");
        // Provider timeout is uncertain, not permission for another spend.
        if (result.receipt.timedOut || result.receipt.code !== 0) break;
      }
    }
    return null;
  }
  const plan = await stage(
    "creative-director",
    options.planner,
    options.capabilities.planner,
    "Write all five planning files. Preserve every intake requirement. Plan exact frame-aligned continuous coverage. Shot schema: " +
      JSON.stringify(shotSchema) +
      '\nasset-requirements.json is {"requirements":[{"id":"...","type":"...","description":"...","required":true,"used_by":["shot-id"],"preferred_source":"...","acceptance":"..."}]}. Every requirement/shot reference must be reciprocal. Empty requirements are allowed only if no external production media is needed. Do not invent acquired media, licenses, scores or completed checks.',
    JSON.stringify({ intake: options.intake, timing: options.timing }),
    (bundle) => validateVideoopsPlan(bundle, options.timing),
  );
  if (!plan)
    return {
      status: "blocked" as const,
      stage: "creative-director",
      attempts: results,
    };
  const owner =
    options.producer +
    ":" +
    options.run +
    "-creative-director:creative-director";
  const nextOwner =
    options.producer + ":" + options.run + "-asset-scout:asset-scout";
  const artifacts = plan.result.artifact!.receipt.artifacts.map((a) => a.path);
  const evidence = ["gate:creative-director:" + plan.result.receipt.attempt];
  const handoff = validateVideoopsHandoff(
    {
      schema: "kujo.handoff/v1",
      assignment: options.task,
      current_owner: owner,
      next_owner: nextOwner,
      goal: "Resolve the validated production plan's assets",
      scope:
        "Supplied verified assets only; no download, generation or publication grant",
      artifacts,
      evidence,
      decisions: [
        "Timing and reference gates passed; creative quality unreviewed",
      ],
      unresolved_questions: [],
      allowed_next_actions: ["resolve-assets"],
      stop_condition:
        "Return the manifest, licenses and source log with explicit unresolved requirements",
    },
    { owner, nextOwner, artifacts, evidence },
  );
  await writeFile(
    resolve(receipts, "planner-to-scout.json"),
    JSON.stringify(handoff, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  async function handoffObserved(
    phase: "started" | "finished",
    outcome: string,
  ) {
    try {
      if ((await stat(options.spool)).size > 250000)
        throw Error("Observation quota");
      await appendFile(
        options.spool,
        JSON.stringify({
          schema: "kujo.lifecycle.v1",
          producer_instance: options.producer,
          profile: options.planner.id,
          run_id: options.run + "-creative-director",
          agent_id: "creative-director",
          task_id: options.task,
          operation_id: "handoff-asset-scout",
          attempt: plan!.result.receipt.attempt,
          kind: "internal",
          capability: "agent.handoff",
          phase,
          outcome,
          occurred_at_ms: Date.now(),
          metadata: { relatedInstance: nextOwner },
        }) + "\n",
      );
    } catch {
      await writeFile(
        options.spool + ".gap",
        "VideoOps handoff observation incomplete",
        { mode: 0o600 },
      ).catch(() => {});
    }
  }
  await handoffObserved("started", "unset");
  const assets = await stage(
    "asset-scout",
    options.scout,
    options.capabilities.scout,
    "Resolve only the supplied acquisition/rights receipts; do not claim a fetch or inspect unprovided files. Every requirement must have explicit FOUND, CAPTURED, GENERATE, NOT_REQUIRED or BLOCKED status. Never omit a required asset. The exact upstream manifest schema follows: " +
      JSON.stringify(assetSchema),
    JSON.stringify({
      handoff,
      planning: plan.checked.bundle,
      acquired: options.verifiedAssets,
    }),
    (bundle) =>
      validateVideoopsAssets(bundle, plan.checked, options.verifiedAssets),
  );
  await handoffObserved("finished", assets ? "succeeded" : "failed");
  const final = {
    status: assets ? assets.checked.status : "blocked",
    stage: "asset-scout",
    attempts: results,
    plan: plan.checked,
    assets: assets?.checked ?? null,
    productionApproval: "NOT_ESTABLISHED",
  };
  await writeFile(
    resolve(receipts, "result.json"),
    JSON.stringify(final, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  return final;
}
