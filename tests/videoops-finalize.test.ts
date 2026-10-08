import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { finalizeVideoops } from "../apps/runner/videoops-finalize";
import { videoopsMissionOutcome } from "../apps/runner/videoops-mission";
test("finalization requires canonical approval and binds completion to actual final bytes", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "city-finalize-")));
  try {
    const id = "mission-00000000-0000-0000-0000-000000000001",
      mission = join(root, id),
      workspace = join(mission, ".city-production/review-1");
    await mkdir(join(workspace, "output"), { recursive: true });
    await mkdir(join(root, "videoops/tools/bin"), { recursive: true });
    await writeFile(join(root, "videoops/tools/bin/videoops"), "fixture");
    await writeFile(
      join(mission, "receipt.json"),
      JSON.stringify({
        schema: "agent-city.videoops-mission.v1",
        id,
        kind: "videoops",
        status: "review-pending",
        code: 0,
        startedAt: "2026-10-08T00:00:00Z",
      }),
    );
    const bytes = Buffer.from("controlled fixture, not video approval");
    const sha = createHash("sha256").update(bytes).digest("hex");
    const options = {
      agentsRepository: root,
      missionDirectory: mission,
      id,
      decision: { candidateSha256: sha, confirmed: true },
    };
    let calls = 0;
    await expect(
      finalizeVideoops(options, async () => {
        calls++;
        return {
          code: 0,
          timedOut: false,
          output: JSON.stringify({
            state: "REVIEW_INCOMPLETE",
            technical: "PASS",
            perceptual: "NOT_REVIEWED",
            candidate: { sha256: sha },
          }),
        };
      }),
    ).rejects.toThrow("not approved");
    expect(calls).toBe(1);
    const execute = async (_cmd: string, args: string[]) => {
      const status = {
        state: "APPROVED",
        technical: "PASS",
        perceptual: "PASS",
        candidate: { sha256: sha },
      };
      if (args.includes("promote")) {
        await writeFile(join(workspace, "output/final.mp4"), bytes);
        return {
          code: 0,
          timedOut: false,
          output: JSON.stringify({
            ...status,
            final: { path: "output/final.mp4", sha256: sha },
          }),
        };
      }
      return { code: 0, timedOut: false, output: JSON.stringify(status) };
    };
    const result = await finalizeVideoops(options, execute);
    expect(result.final.sha256).toBe(sha);
    expect(videoopsMissionOutcome(result, id)?.status).toBe("completed");
    expect(
      JSON.parse(await readFile(join(mission, "receipt.json"), "utf8")).status,
    ).toBe("review-pending");
    expect(
      videoopsMissionOutcome(
        { ...result, native: { ...result.native, perceptual: "FAIL" } },
        id,
      ),
    ).toBeNull();
    expect((await finalizeVideoops(options, execute)).finishedAt).toBe(
      result.finishedAt,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
