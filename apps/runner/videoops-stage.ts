import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ImportedProfile } from "./agent-catalog";
import { validateModelConfig, type ModelConfig } from "./config";
import { boundedCommand } from "./bounded-command";
import { checkObserver } from "./check-observer";
import {
  saveVideoopsAttempt,
  videoopsOutputs,
  type VideoopsStage,
} from "./videoops-artifacts";

export interface VideoopsCapabilityEvidence {
  capability: string;
  evidenceRef: string;
  /** Recorded runtime/operator evidence, never the model's own claim. */
  authority: "runtime" | "operator";
}
export function admitVideoopsStage(
  profile: ImportedProfile,
  stage: VideoopsStage,
  evidence: VideoopsCapabilityEvidence[],
) {
  if (
    !Object.hasOwn(videoopsOutputs, stage) ||
    profile.sourceId !== "videoops." + stage ||
    profile.id !== "kujolang/kujo-agents:" + profile.sourceId
  )
    throw Error("Exact VideoOps stage profile required");
  const modes = ["OBSERVE", "PROPOSE", "ACT"];
  if (
    !modes.includes(profile.permissions.minimum) ||
    !modes.includes(profile.permissions.maximum) ||
    modes.indexOf(profile.permissions.minimum) > 1 ||
    modes.indexOf(profile.permissions.maximum) < 1
  )
    throw Error("VideoOps stage must permit PROPOSE artifact work");
  for (const [name, digest] of [
    ["agent", profile.source.agentHash],
    ["skill", profile.source.skillHash],
  ] as const)
    if (
      createHash("sha256").update(profile.contracts[name]).digest("hex") !==
      digest
    )
      throw Error("Stage contract checksum mismatch");
  if (
    !Array.isArray(evidence) ||
    evidence.length > 32 ||
    evidence.some(
      (e) =>
        !e ||
        !["runtime", "operator"].includes(e.authority) ||
        !/^[a-z][a-z0-9-]{0,63}$/.test(e.capability) ||
        !/^[a-zA-Z0-9_.:/-]{1,256}$/.test(e.evidenceRef),
    )
  )
    throw Error("Bounded capability evidence required");
  const supported = new Set(evidence.map((e) => e.capability));
  const missing = profile.capabilities.required.filter(
    (cap) => !supported.has(cap),
  );
  if (missing.length)
    throw Error("Unestablished VideoOps capabilities: " + missing.join(", "));
}

/** One real SDK execution; no render, publication or model-selected tool calls.
 * Caller owns capability evidence and explicit input snapshots. Text critic output
 * alone is never accepted as perceptual approval by this layer. */
export async function runVideoopsStage(options: {
  root: string;
  workspace: string;
  stage: VideoopsStage;
  attempt: number;
  producer: string;
  run: string;
  task: string;
  profile: ImportedProfile;
  capabilities: VideoopsCapabilityEvidence[];
  instructions: string;
  input: string;
  model: ModelConfig;
  spool: string;
  kujo?: string;
}) {
  admitVideoopsStage(options.profile, options.stage, options.capabilities);
  const model = validateModelConfig(options.model);
  for (const id of [options.producer, options.run, options.task])
    if (!/^[a-zA-Z0-9_.:-]{1,200}$/.test(id))
      throw Error("Invalid source identity");
  if ((options.producer + ":" + options.run + ":" + options.stage).length > 256)
    throw Error("Stage execution identity exceeds artifact reference limit");
  if (
    !Number.isSafeInteger(options.attempt) ||
    options.attempt < 1 ||
    options.attempt > 100
  )
    throw Error("Invalid stage attempt");
  if (
    !options.input.trim() ||
    Buffer.byteLength(options.input) > 131072 ||
    Buffer.byteLength(options.instructions) > 65536
  )
    throw Error("Stage input budget exceeded");
  const workspace = await realpath(options.workspace);
  // One exclusive invocation directory per role/attempt. An uncertain or failed
  // invocation cannot silently spend again under the same attempt identity.
  const directory = resolve(
    workspace,
    ".city-" + options.stage + "-" + options.attempt,
  );
  await mkdir(directory, { mode: 0o700 });
  const request = {
    schema: "agent-city.videoops-stage.v1",
    stage: options.stage,
    profile: options.profile.id,
    producer: options.producer,
    run: options.run,
    task: options.task,
    attempt: options.attempt,
    timeoutSeconds: model.requestTimeoutSeconds ?? 90,
    maxOutputTokens: model.maxOutputTokens ?? 8192,
    instructions:
      options.profile.contracts.agent +
      "\n" +
      options.profile.contracts.skill +
      "\nRuntime boundary: PROPOSE stage-owned artifacts from supplied snapshots only. Declared tools are not model-callable. No network research, filesystem exploration, rendering or publication occurs inside this model call. Runtime performs admitted file writes and separate checks afterward; do not claim their completion. Return ONLY a JSON object with schema agent-city.videoops-artifacts.v1 and files array of {path,content}. Required output paths: " +
      videoopsOutputs[options.stage].join(", ") +
      "\n" +
      options.instructions,
    input: options.input,
  };
  await writeFile(resolve(directory, "request.json"), JSON.stringify(request), {
    mode: 0o600,
    flag: "wx",
  });
  await writeFile(
    resolve(directory, "capabilities.json"),
    JSON.stringify(options.capabilities),
    { mode: 0o600, flag: "wx" },
  );
  const result = await boundedCommand(
    options.kujo || resolve(options.root, "../kujo/target/release/kujo"),
    [
      "run",
      resolve(options.root, "integrations/kujo/videoops-stage.kujo"),
      "--interpreter",
    ],
    {
      cwd: resolve(options.root, "../agents-sdk"),
      env: {
        PATH: process.env.PATH,
        LANG: "C.UTF-8",
        CITY_VIDEOOPS_REQUEST: resolve(directory, "request.json"),
        CITY_VIDEOOPS_RAW: resolve(directory, "raw-output.txt"),
        CITY_VIDEOOPS_RESULT: resolve(directory, "sdk-result.json"),
        CITY_SPOOL: options.spool,
        CITY_MODEL_ENDPOINT: model.endpoint,
        CITY_MODEL: model.model,
        CITY_MODEL_API_KEY: model.apiKey,
      },
      timeoutMs: (request.timeoutSeconds + 45) * 1000,
    },
  );
  if (result.code !== 0 || result.timedOut)
    await writeFile(resolve(directory, "private-process.log"), result.output, {
      mode: 0o600,
      flag: "wx",
    });
  let artifact: Awaited<ReturnType<typeof saveVideoopsAttempt>> | null = null;
  let reason: string | null = null;
  if (result.code === 0 && !result.timedOut) {
    const observe = checkObserver(
      options.spool,
      options.producer,
      options.run,
      options.task,
      {
        agent: "videoops-checker",
        profile: "city-videoops-checker",
        tool: "city.videoops-artifact-contract",
      },
    );
    const operation = options.stage + "-artifact-contract-" + options.attempt;
    await observe(operation, "evaluation", "started", "unset");
    try {
      const sdk = JSON.parse(
        await readFile(resolve(directory, "sdk-result.json"), "utf8"),
      );
      if (
        sdk.status !== "completed" ||
        sdk.run !== options.run ||
        sdk.stage !== options.stage
      )
        throw Error("SDK completion receipt unavailable");
      artifact = await saveVideoopsAttempt({
        workspace,
        stage: options.stage,
        attempt: options.attempt,
        execution: options.producer + ":" + options.run + ":" + options.stage,
        bundle: JSON.parse(
          await readFile(resolve(directory, "raw-output.txt"), "utf8"),
        ),
      });
    } catch (error) {
      reason = (
        error instanceof Error ? error.message : "Invalid artifacts"
      ).slice(0, 1024);
    }
    await observe(
      operation,
      "evaluation",
      "finished",
      artifact ? "succeeded" : "failed",
    );
  } else
    reason = result.timedOut
      ? "Stage timed out; provider outcome may be unknown"
      : "SDK stage did not complete";
  const receipt = {
    schema: "agent-city.videoops-stage-receipt.v1",
    stage: options.stage,
    attempt: options.attempt,
    profile: options.profile.id,
    run: options.run,
    task: options.task,
    status: artifact ? "artifacts-stored" : "failed",
    reason,
    model: model.model,
    underlyingModel: "UNKNOWN",
    code: result.code,
    timedOut: result.timedOut,
    artifact: artifact?.receipt ?? null,
    productionApproval: "NOT_ESTABLISHED",
  };
  await writeFile(
    resolve(directory, "receipt.json"),
    JSON.stringify(receipt, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  return { directory, artifact, receipt };
}
