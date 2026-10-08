import { lstat, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";

const operations = {
  "media.doctor": ["media", "doctor"],
  "media.providers": ["media", "providers"],
  "review.status": ["review", "status"],
} as const;
export type VideoopsInspection = keyof typeof operations;

/** Local inspection of canonical tools only. No authorization, generation or
 * promotion command is available through this surface. Native tools may initialize
 * their private workspace ledger; this is not a source-state read-only API. */
export async function inspectVideoopsNative(options: {
  agentsRepository: string;
  workspace: string;
  operation: VideoopsInspection;
}) {
  if (!Object.hasOwn(operations, options.operation))
    throw Error("Unsupported VideoOps inspection");
  const repo = await realpath(options.agentsRepository);
  const workspace = await realpath(options.workspace);
  if (!(await lstat(workspace)).isDirectory())
    throw Error("VideoOps workspace unavailable");
  const executable = resolve(repo, "videoops/tools/bin/videoops");
  const resolved = await realpath(executable);
  if (resolved !== executable || !(await lstat(executable)).isFile())
    throw Error("Canonical VideoOps executable required");
  const result = await boundedCommand(
    executable,
    [...operations[options.operation], "--workspace", workspace],
    {
      cwd: repo,
      // No provider secrets, Python injection settings or inherited application
      // configuration are passed into this offline capability inspection.
      env: { PATH: process.env.PATH, LANG: "C.UTF-8", PYTHONNOUSERSITE: "1" },
      timeoutMs: 10000,
      graceMs: 1000,
    },
  );
  let receipt: any = null;
  try {
    receipt = JSON.parse(result.output);
  } catch {}
  const schema =
    options.operation === "media.doctor"
      ? "videoops-media-doctor/v1"
      : options.operation === "media.providers"
        ? "videoops-media-capabilities/v1"
        : null;
  const valid =
    receipt &&
    typeof receipt === "object" &&
    !Array.isArray(receipt) &&
    (schema
      ? receipt.schema === schema
      : [
          "APPROVED",
          "REVIEW_INCOMPLETE",
          "REVISION_REQUIRED",
          "BLOCKED",
        ].includes(receipt.state));
  return {
    schema: "agent-city.videoops-inspection.v1",
    operation: options.operation,
    status:
      (result.code === 0 ||
        (options.operation === "review.status" && result.code === 2)) &&
      !result.timedOut &&
      valid
        ? "observed"
        : "unavailable",
    exitCode: result.code,
    timedOut: result.timedOut,
    // Raw stderr is private and may contain host paths. Do not broadcast it.
    reason: result.timedOut
      ? "Inspection timed out"
      : result.spawnError
        ? "Tool could not start"
        : result.code !== 0
          ? "Native tool did not complete successfully"
          : !valid
            ? "Native receipt unavailable"
            : null,
    native: valid ? receipt : null,
    productionReady: false,
    scope:
      "Offline tool inspection only; no model capability, render, account entitlement or perceptual approval established",
  };
}
