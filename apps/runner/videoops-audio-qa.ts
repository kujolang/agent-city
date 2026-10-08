import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { extname, isAbsolute, resolve } from "node:path";
import { boundedCommand } from "./bounded-command";

export type ExactFile = { path: string; sha256: string; bytes: number };
async function exact(ref: ExactFile, limit: number) {
  if (
    !isAbsolute(ref.path) ||
    !/^[a-f0-9]{64}$/.test(ref.sha256) ||
    !Number.isSafeInteger(ref.bytes) ||
    ref.bytes <= 0 ||
    ref.bytes > limit
  )
    throw Error("Invalid bounded audio evidence reference");
  const path = resolve(ref.path);
  const info = await lstat(path);
  if (
    !info.isFile() ||
    info.size !== ref.bytes ||
    (await realpath(path)) !== path
  )
    throw Error("Audio evidence changed or redirected");
  const bytes = await readFile(path);
  if (
    bytes.length !== ref.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== ref.sha256
  )
    throw Error("Audio evidence checksum changed");
  return bytes;
}

export type VideoopsAudioSource = ExactFile & {
  receipt: ExactFile;
  role: "voice" | "music" | "sfx" | "source_video";
  startSeconds?: number;
  durationSeconds?: number;
  gain?: number;
  audioAuthorized?: boolean;
};

export type VideoopsMixClip = {
  assetId: string;
  role: VideoopsAudioSource["role"];
  startSeconds: number;
  durationSeconds: number;
  gain: number;
};

/** Metadata-only local probe. Container signatures and demuxer/protocol bounds
 * reject playlists before FFmpeg can resolve their references. No decoding,
 * generation, source edits or claims about speech content occur here. */
export async function probeVideoopsMediaDuration(
  ref: ExactFile,
  command = boundedCommand,
) {
  const bytes = await exact(ref, 16 * 1024 * 1024);
  const signature =
    (bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WAVE") ||
    ["OggS", "fLaC"].includes(bytes.subarray(0, 4).toString()) ||
    bytes.subarray(0, 3).toString() === "ID3" ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
    bytes.subarray(4, 8).toString() === "ftyp" ||
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!signature)
    throw Error(
      "Unsupported binary media container; playlists are not allowed",
    );
  const result = await command(
    "ffprobe",
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-format_whitelist",
      "mov,mp3,wav,ogg,matroska,webm,flac,aac",
      "-show_entries",
      "format=duration:stream=codec_type,duration",
      "-of",
      "json",
      resolve(ref.path),
    ],
    {
      cwd: resolve(ref.path, ".."),
      env: { PATH: process.env.PATH, LANG: "C.UTF-8" },
      timeoutMs: 15000,
      graceMs: 1000,
    },
  );
  if (result.timedOut || result.code !== 0 || result.output.length > 32768)
    throw Error("Bounded local media probe unavailable");
  let metadata: any;
  try {
    metadata = JSON.parse(result.output);
  } catch {
    throw Error("Invalid local media probe result");
  }
  if (
    !Array.isArray(metadata.streams) ||
    !metadata.streams.length ||
    metadata.streams.length > 16 ||
    metadata.streams.some((s: any) => !s || typeof s.codec_type !== "string")
  )
    throw Error("Unsupported local media streams");
  const durationSeconds = Number(metadata.format?.duration);
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > 600
  )
    throw Error("Local media duration is unavailable or exceeds 600 seconds");
  const audioStreamCount = metadata.streams.filter(
    (s: any) => s.codec_type === "audio",
  ).length;
  const videoPresent = metadata.streams.some(
    (s: any) => s.codec_type === "video",
  );
  if (!audioStreamCount && !videoPresent)
    throw Error("Audio or video stream required");
  await exact(ref, 16 * 1024 * 1024);
  return {
    durationSeconds,
    audioPresent: audioStreamCount > 0,
    audioStreamCount,
    videoPresent,
    sha256: ref.sha256,
  };
}

/** Editor declaration only. Static attenuation is a measurable recipe target,
 * never proof of speech intelligibility or that HTML implements this recipe. */
export function validateVideoopsMixPlan(
  bundle: { files: { path: string; content: string }[] },
  audioAssets: Record<
    string,
    { role: VideoopsAudioSource["role"]; durationSeconds?: number }
  >,
  totalDuration: number,
): VideoopsMixClip[] {
  const plans = bundle.files.filter(
    (file) => file.path === "production/hyperframes/mix-plan.json",
  );
  if (plans.length !== 1 || plans[0].content.length > 32768)
    throw Error("Exactly one bounded Editor mix-plan.json required");
  let plan: any;
  try {
    plan = JSON.parse(plans[0].content);
  } catch {
    throw Error("Invalid Editor mix plan JSON");
  }
  const exactKeys = (value: any, keys: string[]) =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
  if (
    !Number.isFinite(totalDuration) ||
    totalDuration < 1 ||
    totalDuration > 60 ||
    !exactKeys(plan, ["schema", "clips"]) ||
    plan.schema !== "agent-city.videoops-mix.v1" ||
    !Array.isArray(plan.clips) ||
    !plan.clips.length ||
    plan.clips.length > 32 ||
    plan.clips.length !== Object.keys(audioAssets).length
  )
    throw Error("Invalid or incomplete Editor mix plan");
  const seen = new Set<string>();
  const voice = Object.values(audioAssets).some(
    (asset) => asset.role === "voice",
  );
  for (const clip of plan.clips) {
    if (
      !exactKeys(clip, [
        "assetId",
        "role",
        "startSeconds",
        "durationSeconds",
        "gain",
      ]) ||
      typeof clip.assetId !== "string" ||
      !Object.hasOwn(audioAssets, clip.assetId) ||
      seen.has(clip.assetId) ||
      !["voice", "music", "sfx", "source_video"].includes(clip.role) ||
      audioAssets[clip.assetId].role !== clip.role ||
      ![clip.startSeconds, clip.durationSeconds, clip.gain].every(
        (n) => typeof n === "number" && Number.isFinite(n),
      ) ||
      clip.startSeconds < 0 ||
      clip.durationSeconds <= 0 ||
      clip.startSeconds + clip.durationSeconds > totalDuration + 0.05 ||
      clip.gain <= 0 ||
      clip.gain > 4 ||
      (voice && clip.role === "music" && clip.gain > 0.25)
    )
      throw Error(
        "Invalid, unaccounted, or insufficiently attenuated Editor audio clip",
      );
    const sourceDuration = audioAssets[clip.assetId].durationSeconds;
    if (
      sourceDuration !== undefined &&
      (!Number.isFinite(sourceDuration) ||
        sourceDuration <= 0 ||
        sourceDuration > 600 ||
        clip.durationSeconds > sourceDuration + 0.1 ||
        (clip.role === "voice" &&
          Math.abs(clip.durationSeconds - sourceDuration) > 0.1))
    )
      throw Error(
        "Editor audio clip truncates narration or exceeds measured source duration",
      );
    seen.add(clip.assetId);
  }
  return plan.clips;
}

/** Runtime-owned inputs only; paths must never come directly from a browser or
 * model. Mixing remains the Editor's responsibility. These declarations prove
 * traceability, not that a mixed waveform contains every declared source. */
export async function inspectVideoopsAudio(
  options: {
    agentsRepository: string;
    workspace: string;
    candidate: ExactFile;
    durationSeconds: number;
    sources: VideoopsAudioSource[];
    alignment?: { start: number; end: number; text: string }[];
  },
  command = boundedCommand,
) {
  const duration = options.durationSeconds;
  if (!Number.isFinite(duration) || duration < 1 || duration > 60)
    throw Error("Audio QA duration outside supported bounds");
  if (!options.sources.length || options.sources.length > 32)
    throw Error("Declared audio sources required (maximum 32)");
  for (const source of options.sources) {
    if (
      !["voice", "music", "sfx", "source_video"].includes(source.role) ||
      ([source.startSeconds, source.durationSeconds, source.gain].some(
        (x) => x !== undefined,
      ) &&
        (typeof source.startSeconds !== "number" ||
          typeof source.durationSeconds !== "number" ||
          typeof source.gain !== "number" ||
          ![source.startSeconds, source.durationSeconds, source.gain].every(
            Number.isFinite,
          ) ||
          source.startSeconds < 0 ||
          source.durationSeconds <= 0 ||
          source.startSeconds + source.durationSeconds > duration + 0.05 ||
          source.gain <= 0 ||
          source.gain > 4)) ||
      (source.role === "source_video" && source.audioAuthorized !== true)
    )
      throw Error("Invalid or unauthorized audio mix declaration");
  }
  if (
    options.alignment &&
    (options.alignment.length > 1000 ||
      options.alignment.some(
        (item) =>
          !Number.isFinite(item.start) ||
          !Number.isFinite(item.end) ||
          item.start < 0 ||
          item.end <= item.start ||
          item.end > duration + 0.05 ||
          typeof item.text !== "string" ||
          !item.text.trim() ||
          item.text.length > 4096,
      ))
  )
    throw Error("Invalid bounded audio alignment");
  const repo = await realpath(options.agentsRepository);
  const executable = resolve(repo, "videoops/tools/scripts/qa_media.py");
  if (
    (await realpath(executable)) !== executable ||
    !(await lstat(executable)).isFile()
  )
    throw Error("Canonical VideoOps audio QA script required");

  // Validate before creating any workspace or starting the read-only tool.
  const candidate = await exact(options.candidate, 32 * 1024 * 1024);
  const copied = [];
  let total = 0;
  for (const [index, source] of options.sources.entries()) {
    const suffix = extname(source.path).toLowerCase();
    if (
      ![
        ".wav",
        ".flac",
        ".ogg",
        ".mp3",
        ".aac",
        ".m4a",
        ".mp4",
        ".mov",
        ".webm",
      ].includes(suffix)
    )
      throw Error("Unsupported declared audio source container");
    const bytes = await exact(source, 16 * 1024 * 1024);
    const receipt = await exact(source.receipt, 1024 * 1024);
    total += bytes.length + receipt.length;
    if (total > 64 * 1024 * 1024) throw Error("Audio source budget exceeded");
    copied.push({
      source,
      bytes,
      receipt,
      path: `sources/${index}${suffix}`,
      receiptPath: `sources/${index}-receipt.json`,
    });
  }
  const workspace = resolve(options.workspace);
  await mkdir(workspace, { mode: 0o700 });
  if ((await realpath(workspace)) !== workspace)
    throw Error("Audio QA workspace redirected");
  await mkdir(resolve(workspace, "sources"), { mode: 0o700 });
  const save = (path: string, bytes: string | Buffer) =>
    writeFile(resolve(workspace, path), bytes, { mode: 0o600, flag: "wx" });
  await save("candidate.mp4", candidate);
  for (const file of copied) {
    await save(file.path, file.bytes);
    await save(file.receiptPath, file.receipt);
  }
  const config = {
    requirements: {
      duration_seconds: duration,
      duration_tolerance_seconds: 0.1,
      maximum_clipped_samples: 0,
      maximum_true_peak_dbtp: -1,
      stems_required: true,
    },
    ...(options.alignment ? { alignment: options.alignment } : {}),
    stems: copied.map((file) => ({
      role: file.source.role,
      path: file.path,
      sha256: file.source.sha256,
      receipt: file.receiptPath,
      included: true,
      ...(file.source.role === "source_video"
        ? { audio_authorized: true }
        : {}),
    })),
  };
  await save("audio-input.json", JSON.stringify(config, null, 2));
  await save(
    "mix-declarations.json",
    JSON.stringify(
      {
        schema: "agent-city.videoops-audio-mix.v1",
        candidateSha256: options.candidate.sha256,
        sources: copied.map(({ source, path, receiptPath }) => ({
          path,
          sha256: source.sha256,
          receipt: receiptPath,
          receiptSha256: source.receipt.sha256,
          role: source.role,
          startSeconds: source.startSeconds ?? "UNKNOWN",
          durationSeconds: source.durationSeconds ?? "UNKNOWN",
          gain: source.gain ?? "UNKNOWN",
          ...(source.audioAuthorized ? { audioAuthorized: true } : {}),
        })),
        scope:
          "Declared source provenance and mix timing; not forensic source separation or listening approval",
      },
      null,
      2,
    ),
  );
  const result = await command(
    "python3",
    [
      executable,
      workspace,
      "--video",
      "candidate.mp4",
      "--audio-only",
      "--audio-config",
      "audio-input.json",
      "--output",
      "audio-report.json",
    ],
    {
      cwd: repo,
      env: { PATH: process.env.PATH, LANG: "C.UTF-8", PYTHONNOUSERSITE: "1" },
      timeoutMs: 150000,
      graceMs: 1000,
    },
  );
  await save(
    "command-receipt.json",
    JSON.stringify({
      code: result.code,
      timedOut: result.timedOut,
      ...(result.spawnError ? { spawnError: result.spawnError } : {}),
    }),
  );
  if (result.timedOut || (result.code !== 0 && result.code !== 1))
    throw Error("Canonical audio QA unavailable or timed out");
  const reportPath = resolve(workspace, "audio-report.json");
  const info = await lstat(reportPath);
  if (
    !info.isFile() ||
    info.size > 2 * 1024 * 1024 ||
    (await realpath(reportPath)) !== reportPath
  )
    throw Error("Invalid canonical audio report");
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const audio = report.checks?.audio;
  if (
    report.contract !== "kujo-videoops/media-qa/v1" ||
    report.perceptual_review !== "REVIEW_INCOMPLETE" ||
    report.listening_exercised !== false ||
    typeof report.passed !== "boolean" ||
    report.passed !== (result.code === 0) ||
    (report.passed &&
      (audio?.sha256 !== options.candidate.sha256 ||
        audio?.passed !== true ||
        audio?.perceptual?.status !== "REVIEW_INCOMPLETE" ||
        audio?.perceptual?.listening_exercised !== false))
  )
    throw Error("Canonical audio report identity or authority mismatch");
  // Detect mutation of the private candidate or sources during measurement.
  await exact(
    { ...options.candidate, path: resolve(workspace, "candidate.mp4") },
    32 * 1024 * 1024,
  );
  for (const file of copied) {
    await exact(
      { ...file.source, path: resolve(workspace, file.path) },
      16 * 1024 * 1024,
    );
    await exact(
      { ...file.source.receipt, path: resolve(workspace, file.receiptPath) },
      1024 * 1024,
    );
  }
  const evidence = [];
  for (const name of [
    "audio-report.json",
    "mix-declarations.json",
    "audio-input.json",
  ]) {
    const bytes = await readFile(resolve(workspace, name));
    evidence.push({
      name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    });
  }
  return {
    workspace,
    evidence,
    reportPath,
    candidateSha256: options.candidate.sha256,
    passed: report.passed as boolean,
    report,
    perceptual: "REVIEW_INCOMPLETE" as const,
    listeningExercised: false as const,
  };
}
