import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  realpath,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  recordVideoopsHumanReview,
  validateVideoopsHumanDecision,
} from "../apps/runner/videoops-review-decision";
test("explicit review binds candidate and capabilities without claiming technical work or publication", async () => {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "city-human-review-")),
  );
  try {
    await mkdir(join(root, "videoops/tools/bin"), { recursive: true });
    await writeFile(join(root, "videoops/tools/bin/videoops"), "fixture");
    const sha = "a".repeat(64);
    const decision = {
      candidateSha256: sha,
      reviewer: "Fixture reviewer",
      outcome: "PASS",
      capabilities: ["visual_playback"],
      notes: "Controlled test attestation, not real review",
      defects: [],
      confirmed: true,
    };
    let calls = 0;
    const execute = async () => {
      calls++;
      return {
        code: 0,
        timedOut: false,
        output: JSON.stringify({
          state: "REVIEW_INCOMPLETE",
          candidate: {
            sha256: sha,
            mandatory_capabilities: ["visual_playback", "audio_listening"],
          },
        }),
      };
    };
    await expect(
      recordVideoopsHumanReview(
        { agentsRepository: root, workspace: root, decision },
        execute,
      ),
    ).rejects.toThrow("every configured");
    expect(calls).toBe(1);
    await expect(
      recordVideoopsHumanReview(
        {
          agentsRepository: root,
          workspace: root,
          decision: { ...decision, candidateSha256: "b".repeat(64) },
        },
        execute,
      ),
    ).rejects.toThrow("Candidate changed");
    expect(() =>
      validateVideoopsHumanDecision({ ...decision, confirmed: false }),
    ).toThrow();
    expect(() =>
      validateVideoopsHumanDecision({ ...decision, outcome: "FAIL" }),
    ).toThrow();
    const failed = {
      ...decision,
      outcome: "FAIL",
      defects: ["Unreadable title"],
    };
    const result = await recordVideoopsHumanReview(
      { agentsRepository: root, workspace: root, decision: failed },
      execute,
    );
    const stored = JSON.parse(
      await readFile(join(root, result.id + ".json"), "utf8"),
    );
    expect(stored.technical).toBe("NOT_REVIEWED");
    expect(stored.perceptual).toBe("FAIL");
    expect(stored.defects[0].description).toBe("Unreadable title");
    expect(result.publication).toBe("NOT_PERFORMED");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
