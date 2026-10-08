import { resolve } from "node:path";
import { probeVideoopsMediaDuration } from "./videoops-audio-qa";
import type { VideoopsMediaPack } from "./videoops-media-pack";
/** Product footage currently carries no implicit soundtrack grant. Reject an
 * embedded soundtrack before model spend; use an explicitly declared audio stem. */
export async function inspectVideoopsPackStreams(
  root: string,
  pack: VideoopsMediaPack,
  videoDuration: number,
  probe = probeVideoopsMediaDuration,
) {
  const audio: Record<
    string,
    { role: "voice" | "music" | "sfx"; durationSeconds: number }
  > = {};
  for (const asset of pack.assets) {
    if (!/\.(mp3|wav|ogg|m4a|mp4|webm)$/.test(asset.path)) continue;
    const actual = await probe({
      path: resolve(root, asset.path),
      sha256: asset.sha256,
      bytes: asset.bytes,
    });
    if (/\.(mp4|webm)$/.test(asset.path)) {
      if (actual.audioPresent)
        throw Error(
          "Footage contains an undeclared soundtrack. Supply silent footage plus separate explicitly declared audio stems.",
        );
      if (!actual.videoPresent)
        throw Error("Expected footage video stream unavailable");
      continue;
    }
    if (
      !actual.audioPresent ||
      !asset.audioRole ||
      asset.durationSeconds === undefined ||
      Math.abs(actual.durationSeconds - asset.durationSeconds) > 0.15
    )
      throw Error(
        "Audio role, stream or declared source duration does not match acquired media",
      );
    if (
      asset.audioRole === "voice" &&
      actual.durationSeconds > videoDuration + 0.1
    )
      throw Error("Complete narration cannot fit the requested video duration");
    audio[asset.id] = {
      role: asset.audioRole,
      durationSeconds: actual.durationSeconds,
    };
  }
  return audio;
}
