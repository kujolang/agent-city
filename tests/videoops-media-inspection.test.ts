import { test, expect } from "vitest";
import { inspectVideoopsPackStreams } from "../apps/runner/videoops-media-inspection";
const pack = (path: string, extra: any = {}) =>
  ({
    schema: "agent-city.videoops-media-pack.v1",
    name: "fixture",
    styleIntake: "fixture",
    licenses: [],
    assets: [
      {
        id: "source",
        path,
        sha256: "a".repeat(64),
        bytes: 4,
        description: "fixture",
        rightsEvidence: "fixture",
        ...extra,
      },
    ],
  }) as const;
test("footage cannot smuggle an undeclared soundtrack past visual upload metadata", async () => {
  const probe: any = async () => ({
    audioPresent: true,
    videoPresent: true,
    durationSeconds: 6,
  });
  await expect(
    inspectVideoopsPackStreams(
      "/fixture",
      pack("assets/captured/game.mp4") as any,
      6,
      probe,
    ),
  ).rejects.toThrow("undeclared soundtrack");
  const silent: any = async () => ({
    audioPresent: false,
    videoPresent: true,
    durationSeconds: 6,
  });
  expect(
    await inspectVideoopsPackStreams(
      "/fixture",
      pack("assets/captured/game.mp4") as any,
      6,
      silent,
    ),
  ).toEqual({});
});
test("measured duration overrides declarations and protects complete narration", async () => {
  const source = pack("assets/audio/voice.mp3", {
    audioRole: "voice",
    durationSeconds: 3.52,
  }) as any;
  const probe: any = async () => ({
    audioPresent: true,
    videoPresent: false,
    durationSeconds: 3.55,
  });
  expect(
    await inspectVideoopsPackStreams("/fixture", source, 6, probe),
  ).toEqual({ source: { role: "voice", durationSeconds: 3.55 } });
  await expect(
    inspectVideoopsPackStreams("/fixture", source, 2, probe),
  ).rejects.toThrow("Complete narration");
  const changed: any = async () => ({
    audioPresent: true,
    durationSeconds: 10,
  });
  await expect(
    inspectVideoopsPackStreams("/fixture", source, 20, changed),
  ).rejects.toThrow("does not match");
});
