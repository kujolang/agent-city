import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";
import type { renderVideoopsAttempt } from "./videoops-render";
import type { inspectVideoopsAudio } from "./videoops-audio-qa";

/** Internal runtime handoff, not a browser/model supplied receipt. Only records
 * completed technical work. Perceptual approval requires a separate reviewer. */
export async function submitVideoopsReview(options: {
  agentsRepository: string;
  workspace: string;
  candidate: Awaited<ReturnType<typeof renderVideoopsAttempt>>;
  mandatoryCapabilities: ("visual_playback" | "audio_listening")[];
  audioQa?: Awaited<ReturnType<typeof inspectVideoopsAudio>>;
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
  const audioEvidence: { name: string; sha256: string; bytes: number }[] = [];
  if (options.audioQa) {
    const qa = options.audioQa;
    if (
      !qa.passed ||
      qa.candidateSha256 !== video.sha256 ||
      qa.perceptual !== "REVIEW_INCOMPLETE" ||
      qa.listeningExercised !== false ||
      !caps.includes("audio_listening")
    )
      throw Error(
        "Exact passed audio QA and separate listening review required",
      );
    const directory = resolve(qa.workspace);
    if ((await realpath(directory)) !== directory)
      throw Error("Audio QA evidence redirected");
    const names = [
      "audio-report.json",
      "mix-declarations.json",
      "audio-input.json",
    ];
    if (
      qa.evidence.length !== names.length ||
      new Set(qa.evidence.map((r) => r.name)).size !== names.length
    )
      throw Error("Complete exact audio QA evidence required");
    for (const name of names) {
      const ref = qa.evidence.find((r) => r.name === name),
        path = resolve(directory, name);
      const info = await lstat(path);
      if (
        !ref ||
        !/^[a-f0-9]{64}$/.test(ref.sha256) ||
        !info.isFile() ||
        info.size !== ref.bytes ||
        info.size > 2097152 ||
        (await realpath(path)) !== path
      )
        throw Error("Audio QA evidence changed or redirected");
      const bytes = await readFile(path);
      if (
        bytes.length !== ref.bytes ||
        createHash("sha256").update(bytes).digest("hex") !== ref.sha256
      )
        throw Error("Audio QA evidence checksum changed");
      const content = JSON.parse(bytes.toString("utf8"));
      if (
        name === "audio-report.json" &&
        (content.contract !== "kujo-videoops/media-qa/v1" ||
          content.passed !== true ||
          content.checks?.audio?.sha256 !== video.sha256 ||
          content.perceptual_review !== "REVIEW_INCOMPLETE" ||
          content.listening_exercised !== false)
      )
        throw Error("Audio QA evidence candidate or authority mismatch");
      if (
        name === "mix-declarations.json" &&
        content.candidateSha256 !== video.sha256
      )
        throw Error("Audio mix evidence candidate mismatch");
      files.push({ name: "audio-qa/" + name, bytes });
      audioEvidence.push({ ...ref, name: "audio-qa/" + name });
    }
  }
  const workspace = resolve(options.workspace);
  await mkdir(workspace, { mode: 0o700 });
  if ((await realpath(workspace)) !== workspace)
    throw Error("Review workspace redirected");
  await mkdir(resolve(workspace, "output"), { mode: 0o700 });
  if (audioEvidence.length) {
    await mkdir(resolve(workspace, "audio-qa"), { mode: 0o700 });
    await writeFile(
      resolve(workspace, "audio-qa/evidence.json"),
      JSON.stringify({
        candidateSha256: video.sha256,
        files: audioEvidence,
        scope:
          "Deterministic audio QA and declared mix provenance; human listening remains required",
      }),
      { mode: 0o600, flag: "wx" },
    );
  }
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
    evidence: [
      "output/metadata.json",
      "output/check.json",
      "lineage.json",
      ...audioEvidence.map((r) => r.name),
      ...(audioEvidence.length ? ["audio-qa/evidence.json"] : []),
    ],
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
