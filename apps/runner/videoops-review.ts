import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";
import type { renderVideoopsAttempt } from "./videoops-render";

/** Internal runtime handoff, not a browser/model supplied receipt. Only records
 * completed technical work. Perceptual approval requires a separate reviewer. */
export async function submitVideoopsReview(options: {
  agentsRepository: string;
  workspace: string;
  candidate: Awaited<ReturnType<typeof renderVideoopsAttempt>>;
  mandatoryCapabilities: ("visual_playback" | "audio_listening")[];
}) {
  const candidate = options.candidate;
  const caps = options.mandatoryCapabilities;
  if (
    !caps.length ||
    new Set(caps).size !== caps.length ||
    caps.some((c) => !["visual_playback", "audio_listening"].includes(c))
  )
    throw Error("Explicit perceptual review requirements required");
  if (
    candidate.schema !== "agent-city.videoops-candidate.v1" ||
    candidate.status !== "ready-for-review" ||
    candidate.metadata.technical !== "passed" ||
    candidate.productionApproval !== "NOT_ESTABLISHED" ||
    !/^wc-[a-f0-9]{32}$/.test(candidate.workcell.runId)
  )
    throw Error("Verified runtime render candidate required");
  const repo = await realpath(options.agentsRepository);
  const executable = resolve(repo, "videoops/tools/bin/videoops");
  if (
    (await realpath(executable)) !== executable ||
    !(await lstat(executable)).isFile()
  )
    throw Error("Canonical VideoOps executable required");
  const source = await realpath(candidate.directory);
  if (source !== resolve(candidate.directory))
    throw Error("Candidate directory redirected");
  const files = [];
  for (const name of [
    "output/draft.mp4",
    "output/metadata.json",
    "output/check.json",
  ]) {
    const ref = candidate.workcell.artifacts.find((a) => a.name === name);
    const file = resolve(source, name);
    const info = await lstat(file);
    const limit = name.endsWith(".mp4") ? 33554432 : 2097152;
    if (
      !ref ||
      !info.isFile() ||
      info.size > limit ||
      info.size !== ref.bytes ||
      (await realpath(file)) !== file
    )
      throw Error("Candidate evidence changed");
    const bytes = await readFile(file);
    if (
      bytes.length !== ref.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== ref.sha256
    )
      throw Error("Candidate evidence checksum changed");
    files.push({ name, bytes });
  }
  const video = candidate.workcell.artifacts.find(
    (a) => a.name === "output/draft.mp4",
  )!;
  if (video.sha256 !== candidate.candidate.sha256)
    throw Error("Candidate identity mismatch");
  const workspace = resolve(options.workspace);
  await mkdir(workspace, { mode: 0o700 });
  if ((await realpath(workspace)) !== workspace)
    throw Error("Review workspace redirected");
  await mkdir(resolve(workspace, "output"), { mode: 0o700 });
  for (const file of files)
    await writeFile(resolve(workspace, file.name), file.bytes, {
      mode: 0o600,
      flag: "wx",
    });
  await writeFile(
    resolve(workspace, "lineage.json"),
    JSON.stringify(candidate, null, 2),
    { mode: 0o600, flag: "wx" },
  );
  async function native(name: string, args: string[]) {
    const result = await boundedCommand(
      executable,
      ["review", name, "--workspace", workspace, ...args],
      {
        cwd: repo,
        env: { PATH: process.env.PATH, LANG: "C.UTF-8", PYTHONNOUSERSITE: "1" },
        timeoutMs: 10000,
        graceMs: 1000,
      },
    );
    await writeFile(
      resolve(workspace, name + "-receipt.json"),
      JSON.stringify(result),
      { mode: 0o600, flag: "wx" },
    );
    if (result.code !== 0 || result.timedOut)
      throw Error("Native review handoff unavailable: " + name);
    return JSON.parse(result.output);
  }
  await native("render-attempt", [
    "--attempt-id",
    candidate.workcell.runId,
    "--outcome",
    "succeeded",
  ]);
  await native("submit-candidate", [
    "--candidate",
    "output/draft.mp4",
    "--render-attempt-id",
    candidate.workcell.runId,
    "--mandatory-capabilities",
    ...caps,
  ]);
  const decision = {
    version: "videoops-review-decision/v1",
    id: "technical-" + candidate.workcell.runId,
    candidate_sha256: video.sha256,
    technical: "PASS",
    perceptual: "NOT_REVIEWED",
    reviewer: {
      identity: "agent-city.workcell-render-validation",
      type: "technical_tool",
      capabilities_exercised: ["deterministic_validation"],
    },
    evidence: ["output/metadata.json", "output/check.json", "lineage.json"],
    defects: [],
    reviewed_at: new Date().toISOString(),
  };
  await writeFile(
    resolve(workspace, "technical-decision.json"),
    JSON.stringify(decision),
    { mode: 0o600, flag: "wx" },
  );
  const status = await native("record", [
    "--decision",
    resolve(workspace, "technical-decision.json"),
    "--authorize-local",
  ]);
  if (
    status.candidate?.sha256 !== video.sha256 ||
    status.technical !== "PASS" ||
    status.state !== "REVIEW_INCOMPLETE"
  )
    throw Error("Native review did not retain separate perceptual gate");
  return { workspace, status, productionApproval: "NOT_ESTABLISHED" };
}
