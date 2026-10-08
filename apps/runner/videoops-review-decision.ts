import { randomUUID } from "node:crypto";
import { lstat, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";

export interface VideoopsHumanDecision {
  candidateSha256: string;
  reviewer: string;
  outcome: "PASS" | "FAIL" | "REVIEW_INCOMPLETE";
  capabilities: ("visual_playback" | "audio_listening")[];
  notes: string;
  defects: string[];
  confirmed: true;
}
export function validateVideoopsHumanDecision(
  value: unknown,
): VideoopsHumanDecision {
  const v = value as VideoopsHumanDecision;
  if (
    !v ||
    Object.keys(v).some(
      (k) =>
        ![
          "candidateSha256",
          "reviewer",
          "outcome",
          "capabilities",
          "notes",
          "defects",
          "confirmed",
        ].includes(k),
    ) ||
    !/^[a-f0-9]{64}$/.test(v.candidateSha256) ||
    typeof v.reviewer !== "string" ||
    !v.reviewer.trim() ||
    v.reviewer.length > 128 ||
    !["PASS", "FAIL", "REVIEW_INCOMPLETE"].includes(v.outcome) ||
    v.confirmed !== true ||
    typeof v.notes !== "string" ||
    !v.notes.trim() ||
    Buffer.byteLength(v.notes) > 8192 ||
    !Array.isArray(v.capabilities) ||
    new Set(v.capabilities).size !== v.capabilities.length ||
    v.capabilities.some(
      (c) => !["visual_playback", "audio_listening"].includes(c),
    ) ||
    !Array.isArray(v.defects) ||
    v.defects.length > 16 ||
    v.defects.some(
      (d) => typeof d !== "string" || !d.trim() || Buffer.byteLength(d) > 1024,
    ) ||
    (v.outcome === "FAIL" ? !v.defects.length : v.defects.length > 0)
  )
    throw Error("Explicit bounded human review decision required");
  return structuredClone(v);
}
/** Authenticated local operator surface only. Never accept model-created decisions.
 * The human attests which capabilities they exercised; this is not automated
 * video understanding. Native review independently binds gates/evidence/bytes. */
export async function recordVideoopsHumanReview(
  options: { agentsRepository: string; workspace: string; decision: unknown },
  execute = boundedCommand,
) {
  const decision = validateVideoopsHumanDecision(options.decision);
  const repo = await realpath(options.agentsRepository),
    workspace = await realpath(options.workspace);
  const executable = resolve(repo, "videoops/tools/bin/videoops");
  if (
    (await realpath(executable)) !== executable ||
    !(await lstat(executable)).isFile()
  )
    throw Error("Canonical VideoOps executable required");
  async function native(args: string[]) {
    const result = await execute(
      executable,
      ["review", ...args, "--workspace", workspace],
      {
        cwd: repo,
        env: { PATH: process.env.PATH, LANG: "C.UTF-8", PYTHONNOUSERSITE: "1" },
        timeoutMs: 10000,
        graceMs: 1000,
      },
    );
    if (result.timedOut || ![0, 2].includes(result.code ?? -1))
      throw Error(
        "Native review unavailable; inspect existing ledger before retry",
      );
    let receipt: any;
    try {
      receipt = JSON.parse(result.output);
    } catch {
      throw Error("Native review receipt unavailable");
    }
    if (
      ![
        "APPROVED",
        "REVIEW_INCOMPLETE",
        "REVISION_REQUIRED",
        "BLOCKED",
      ].includes(receipt.state)
    )
      throw Error("Invalid native review state");
    return receipt;
  }
  const before = await native(["status"]);
  if (before.candidate?.sha256 !== decision.candidateSha256)
    throw Error("Candidate changed; review the current video");
  if (before.candidate.promotion)
    throw Error(
      "Finalized candidate review is immutable; start a revised production",
    );
  const mandatory = before.candidate.mandatory_capabilities;
  if (!Array.isArray(mandatory) || !mandatory.length)
    throw Error("Native perceptual gates unavailable");
  if (
    decision.outcome === "PASS" &&
    mandatory.some((c: string) => !decision.capabilities.includes(c as any))
  )
    throw Error("PASS requires attesting every configured review capability");
  const id = "human-" + randomUUID();
  const evidence = id + "-notes.json";
  await writeFile(
    resolve(workspace, evidence),
    JSON.stringify(decision, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  const file = resolve(workspace, id + ".json");
  await writeFile(
    file,
    JSON.stringify(
      {
        version: "videoops-review-decision/v1",
        id,
        candidate_sha256: decision.candidateSha256,
        technical: "NOT_REVIEWED",
        perceptual: decision.outcome,
        reviewer: {
          identity: decision.reviewer,
          type: "human",
          capabilities_exercised: decision.capabilities,
        },
        evidence: [evidence],
        defects: decision.defects.map((description) => ({
          gate: "perceptual",
          description,
        })),
        reviewed_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    { mode: 0o600, flag: "wx" },
  );
  const status = await native([
    "record",
    "--decision",
    file,
    "--authorize-local",
  ]);
  if (status.candidate?.sha256 !== decision.candidateSha256)
    throw Error("Native review candidate mismatch");
  return {
    id,
    status,
    authority: "explicit-local-human-attestation",
    publication: "NOT_PERFORMED",
  };
}
