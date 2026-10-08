import { expect, test } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { boundedCommand } from "../apps/runner/bounded-command";
import {
  inspectVideoopsAudio,
  probeVideoopsMediaDuration,
  validateVideoopsMixPlan,
} from "../apps/runner/videoops-audio-qa";

test("Editor mix plan accounts for every requested source and declares reduced music gain", () => {
  const assets = {
    narration: { role: "voice" as const },
    bed: { role: "music" as const },
  };
  const clips = [
    {
      assetId: "narration",
      role: "voice",
      startSeconds: 0.25,
      durationSeconds: 3,
      gain: 1,
    },
    {
      assetId: "bed",
      role: "music",
      startSeconds: 0,
      durationSeconds: 6,
      gain: 0.2,
    },
  ];
  const bundle = (items: unknown[], extra = {}) => ({
    files: [
      {
        path: "production/hyperframes/mix-plan.json",
        content: JSON.stringify({
          schema: "agent-city.videoops-mix.v1",
          clips: items,
          ...extra,
        }),
      },
    ],
  });
  expect(validateVideoopsMixPlan(bundle(clips), assets, 6)).toEqual(clips);
  expect(() =>
    validateVideoopsMixPlan(bundle(clips.slice(0, 1)), assets, 6),
  ).toThrow("incomplete");
  expect(() =>
    validateVideoopsMixPlan(
      bundle([clips[0], { ...clips[1], gain: 1 }]),
      assets,
      6,
    ),
  ).toThrow("attenuated");
  expect(() =>
    validateVideoopsMixPlan(
      bundle([clips[0], { ...clips[1], durationSeconds: 7 }]),
      assets,
      6,
    ),
  ).toThrow("clip");
  expect(() =>
    validateVideoopsMixPlan(bundle([clips[0], clips[0]]), assets, 6),
  ).toThrow("clip");
  expect(() =>
    validateVideoopsMixPlan(bundle(clips, { approved: true }), assets, 6),
  ).toThrow("Invalid");
  expect(() => validateVideoopsMixPlan({ files: [] }, assets, 6)).toThrow(
    "required",
  );
  const measured = {
    narration: { role: "voice" as const, durationSeconds: 3 },
    bed: { role: "music" as const, durationSeconds: 6 },
  };
  expect(validateVideoopsMixPlan(bundle(clips), measured, 6)).toEqual(clips);
  expect(() =>
    validateVideoopsMixPlan(
      bundle([{ ...clips[0], durationSeconds: 0.1 }, clips[1]]),
      measured,
      6,
    ),
  ).toThrow("truncates narration");
  expect(() =>
    validateVideoopsMixPlan(
      bundle(clips),
      { ...measured, bed: { role: "music", durationSeconds: 2 } },
      6,
    ),
  ).toThrow("measured source");
});

test("media probe rejects a disguised playlist before executing ffprobe", async () => {
  const { root, file } = await fixture();
  try {
    const playlist = await file(
      "playlist.mp4",
      Buffer.from("#EXTM3U\nhttp://example.invalid/audio.mp3"),
    );
    let called = false;
    await expect(
      probeVideoopsMediaDuration(playlist, async () => {
        called = true;
        throw Error("Unexpected probe");
      }),
    ).rejects.toThrow("playlists");
    expect(called).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "city-audio-")));
  await mkdir(join(root, "videoops/tools/scripts"), { recursive: true });
  await writeFile(join(root, "videoops/tools/scripts/qa_media.py"), "fixture");
  async function file(name: string, bytes = Buffer.from(name)) {
    const path = join(root, name);
    await writeFile(path, bytes);
    return {
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }
  const candidate = await file("render.mp4");
  const receipt = await file("receipt.json");
  const source = {
    ...(await file("voice.wav")),
    receipt,
    role: "voice" as const,
  };
  return {
    root,
    file,
    options: {
      agentsRepository: root,
      workspace: join(root, "qa"),
      candidate,
      sources: [source],
      durationSeconds: 2,
    },
  };
}

test("audio QA preserves exact source lineage, unknown mixing and separate listening authority", async () => {
  const { root, options } = await fixture();
  try {
    const command: typeof boundedCommand = async (_exe, args, config) => {
      expect(args).toContain("--audio-only");
      expect(config.env?.PYTHONNOUSERSITE).toBe("1");
      expect(config.timeoutMs).toBe(150000);
      const report = {
        contract: "kujo-videoops/media-qa/v1",
        passed: true,
        perceptual_review: "REVIEW_INCOMPLETE",
        listening_exercised: false,
        checks: {
          audio: {
            passed: true,
            sha256: options.candidate.sha256,
            perceptual: {
              status: "REVIEW_INCOMPLETE",
              listening_exercised: false,
            },
          },
        },
      };
      await writeFile(
        join(options.workspace, "audio-report.json"),
        JSON.stringify(report),
      );
      return { code: 0, output: "", timedOut: false };
    };
    const result = await inspectVideoopsAudio(options, command);
    expect(result.passed).toBe(true);
    expect(result.listeningExercised).toBe(false);
    const mix = JSON.parse(
      await readFile(join(options.workspace, "mix-declarations.json"), "utf8"),
    );
    expect(mix.sources[0].gain).toBe("UNKNOWN");
    expect(mix.sources[0].sha256).toBe(options.sources[0].sha256);
    expect(mix.sources[0].receiptSha256).toBe(
      options.sources[0].receipt.sha256,
    );
    expect(await readFile(join(options.workspace, "sources/0.wav"))).toEqual(
      await readFile(options.sources[0].path),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("changed evidence, symlinks and unauthorized source sound block before tool invocation", async () => {
  const { root, options } = await fixture();
  let called = false;
  const command: typeof boundedCommand = async () => {
    called = true;
    throw Error("unexpected");
  };
  try {
    await expect(
      inspectVideoopsAudio(
        {
          ...options,
          sources: [{ ...options.sources[0], role: "source_video" }],
        },
        command,
      ),
    ).rejects.toThrow("unauthorized");
    await expect(
      inspectVideoopsAudio(
        { ...options, sources: [{ ...options.sources[0], gain: 1 }] },
        command,
      ),
    ).rejects.toThrow("declaration");
    await expect(
      inspectVideoopsAudio(
        {
          ...options,
          candidate: { ...options.candidate, sha256: "0".repeat(64) },
        },
        command,
      ),
    ).rejects.toThrow("checksum");
    await symlink(options.sources[0].path, join(root, "alias.wav"));
    await expect(
      inspectVideoopsAudio(
        {
          ...options,
          sources: [{ ...options.sources[0], path: join(root, "alias.wav") }],
        },
        command,
      ),
    ).rejects.toThrow("redirected");
    expect(called).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a report for another candidate or claimed listening is never accepted", async () => {
  const { root, options } = await fixture();
  try {
    await expect(
      inspectVideoopsAudio(options, async () => {
        await writeFile(
          join(options.workspace, "audio-report.json"),
          JSON.stringify({
            contract: "kujo-videoops/media-qa/v1",
            passed: true,
            perceptual_review: "PASS",
            listening_exercised: true,
          }),
        );
        return { code: 0, output: "", timedOut: false };
      }),
    ).rejects.toThrow("authority mismatch");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const repository = resolve(process.cwd(), "../kujo-agents");
test.skipIf(
  !existsSync(join(repository, "videoops/tools/scripts/qa_media.py")),
)(
  "canonical QA measures actual encoded sound and rejects silent video",
  async () => {
    const { root, options, file } = await fixture();
    async function ffmpeg(args: string[]) {
      const result = await boundedCommand(
        "ffmpeg",
        ["-v", "error", "-y", ...args],
        { cwd: root, timeoutMs: 15000 },
      );
      expect(result.code, result.output).toBe(0);
    }
    try {
      await ffmpeg([
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000:duration=2",
        "voice.wav",
      ]);
      const source = {
        ...(await file("voice.wav", await readFile(join(root, "voice.wav")))),
        receipt: options.sources[0].receipt,
        role: "voice" as const,
        startSeconds: 0,
        durationSeconds: 2,
        gain: 1,
      };
      await ffmpeg([
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=64x64:r=24:d=2",
        "-i",
        "voice.wav",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-t",
        "2",
        "render.mp4",
      ]);
      const candidate = await file(
        "render.mp4",
        await readFile(join(root, "render.mp4")),
      );
      expect(await probeVideoopsMediaDuration(candidate)).toMatchObject({
        durationSeconds: 2,
        audioPresent: true,
        videoPresent: true,
        sha256: candidate.sha256,
      });
      expect(await probeVideoopsMediaDuration(source)).toMatchObject({
        durationSeconds: 2,
        audioPresent: true,
        videoPresent: false,
      });
      const result = await inspectVideoopsAudio({
        ...options,
        agentsRepository: repository,
        sources: [source],
        candidate,
      });
      expect(result.passed, JSON.stringify(result.report)).toBe(true);
      expect(result.report.checks.audio.checks.stream.sample_rate).toBe(48000);
      expect(result.report.checks.audio.checks.stems[0].sha256).toBe(
        source.sha256,
      );
      expect(result.perceptual).toBe("REVIEW_INCOMPLETE");
      await ffmpeg(["-i", "render.mp4", "-an", "-c:v", "copy", "silent.mp4"]);
      const silent = await file(
        "silent.mp4",
        await readFile(join(root, "silent.mp4")),
      );
      expect(await probeVideoopsMediaDuration(silent)).toMatchObject({
        durationSeconds: 2,
        audioPresent: false,
        videoPresent: true,
      });
      const failure = await inspectVideoopsAudio({
        ...options,
        agentsRepository: repository,
        sources: [source],
        candidate: silent,
        workspace: join(root, "silent-qa"),
      });
      expect(failure.passed).toBe(false);
      expect(failure.report.failures).toContain("audio stream missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
  30000,
);
