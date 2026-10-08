import { lstat, readFile, realpath } from "node:fs/promises";
import {
  admitVideoopsStage,
  type VideoopsCapabilityEvidence,
} from "./videoops-stage";
import type { ImportedProfile } from "./agent-catalog";
export interface VideoopsLaunchConfig {
  image: string;
  planner: ImportedProfile;
  scout: ImportedProfile;
  editor: ImportedProfile;
  capabilities: {
    planner: VideoopsCapabilityEvidence[];
    scout: VideoopsCapabilityEvidence[];
    editor: VideoopsCapabilityEvidence[];
  };
}
/** This private operator configuration cannot be supplied by task/model JSON. */
export async function readVideoopsLaunchConfig(file: string) {
  const info = await lstat(file);
  if (!info.isFile() || info.size > 524288 || (await realpath(file)) !== file)
    throw Error("Bounded regular VideoOps operator configuration required");
  const value = JSON.parse(
    await readFile(file, "utf8"),
  ) as VideoopsLaunchConfig;
  if (!/^sha256:[a-f0-9]{64}$/.test(value.image))
    throw Error("VideoOps immutable image required");
  admitVideoopsStage(
    value.planner,
    "creative-director",
    value.capabilities?.planner,
  );
  admitVideoopsStage(value.scout, "asset-scout", value.capabilities?.scout);
  admitVideoopsStage(
    value.editor,
    "hyperframes-editor",
    value.capabilities?.editor,
  );
  return value;
}
export function validateVideoopsMission(value: unknown) {
  const v = value as any;
  if (
    !v ||
    Object.keys(v).some(
      (k) =>
        ![
          "workflow",
          "prompt",
          "width",
          "height",
          "fps",
          "durationSeconds",
          "allowRender",
        ].includes(k),
    ) ||
    v.workflow !== "videoops" ||
    typeof v.prompt !== "string" ||
    !v.prompt.trim() ||
    Buffer.byteLength(v.prompt) > 16384 ||
    v.allowRender !== true ||
    !Number.isInteger(v.width) ||
    v.width < 256 ||
    v.width > 1920 ||
    !Number.isInteger(v.height) ||
    v.height < 240 ||
    v.height > 1920 ||
    v.width * v.height > 2073600 ||
    ![24, 25, 30, 50, 60].includes(v.fps) ||
    !Number.isFinite(v.durationSeconds) ||
    v.durationSeconds <= 0 ||
    v.durationSeconds > 60 ||
    !Number.isInteger(v.durationSeconds * v.fps)
  )
    throw Error(
      "Bounded video request and explicit isolated render consent required",
    );
  return {
    workflow: "videoops" as const,
    prompt: v.prompt as string,
    width: v.width as number,
    height: v.height as number,
    fps: v.fps as number,
    durationSeconds: v.durationSeconds as number,
    allowRender: true as const,
  };
}
/** A successful child exit alone never establishes a finished video production. */
export function videoopsMissionOutcome(value: unknown, id: string) {
  const v = value as any;
  if (
    !v ||
    v.schema !== "agent-city.videoops-mission.v1" ||
    v.id !== id ||
    v.kind !== "videoops" ||
    !Number.isFinite(Date.parse(v.finishedAt)) ||
    !Number.isFinite(Date.parse(v.startedAt))
  )
    return null;
  if (
    v.status === "review-pending" &&
    v.code === 0 &&
    v.productionStatus === "review-pending"
  )
    return {
      status: "review-pending" as const,
      finishedAt: v.finishedAt as string,
    };
  if (
    v.status === "failed" &&
    v.code === 1 &&
    v.productionStatus === "blocked" &&
    v.uncertain === false
  )
    return { status: "failed" as const, finishedAt: v.finishedAt as string };
  return null;
}
