import { expect, test, vi } from "vitest";
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
import { boundedCommand } from "../apps/runner/bounded-command";
import { submitVideoopsReview } from "../apps/runner/videoops-review";
vi.mock("../apps/runner/bounded-command", () => ({ boundedCommand: vi.fn() }));
test("review handoff preserves exact bytes, explicit gates and separate technical authority", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "city-review-")));
  try {
    await mkdir(join(root, "videoops/tools/bin"), { recursive: true });
    await writeFile(join(root, "videoops/tools/bin/videoops"), "fixture");
    const directory = join(root, "candidate");
    await mkdir(join(directory, "output"), { recursive: true });
    const artifacts = [];
    for (const name of [
      "output/draft.mp4",
      "output/metadata.json",
      "output/check.json",
    ]) {
      const bytes = Buffer.from(name);
      await writeFile(join(directory, name), bytes);
      artifacts.push({
        name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    const candidate: any = {
      schema: "agent-city.videoops-candidate.v1",
      status: "ready-for-review",
      directory,
      workcell: { runId: "wc-" + "a".repeat(32), artifacts },
      candidate: artifacts[0],
      metadata: { technical: "passed" },
      productionApproval: "NOT_ESTABLISHED",
    };
    const command = vi.mocked(boundedCommand);
    command.mockClear();
    command.mockResolvedValue({
      code: 0,
      timedOut: false,
      output: JSON.stringify({
        state: "REVIEW_INCOMPLETE",
        technical: "PASS",
        perceptual: "NOT_REVIEWED",
        candidate: { sha256: artifacts[0].sha256 },
      }),
    });
    const workspace = join(root, "review");
    const qaWorkspace = join(root, "audio-qa");
    await mkdir(qaWorkspace);
    const qaFiles = [
      {
        name: "audio-report.json",
        content: {
          contract: "kujo-videoops/media-qa/v1",
          passed: true,
          checks: { audio: { sha256: artifacts[0].sha256 } },
          perceptual_review: "REVIEW_INCOMPLETE",
          listening_exercised: false,
        },
      },
      {
        name: "mix-declarations.json",
        content: { candidateSha256: artifacts[0].sha256 },
      },
      { name: "audio-input.json", content: { stems: [] } },
    ];
    const evidence = [];
    for (const file of qaFiles) {
      const bytes = Buffer.from(JSON.stringify(file.content));
      await writeFile(join(qaWorkspace, file.name), bytes);
      evidence.push({
        name: file.name,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    const audioQa = {
      workspace: qaWorkspace,
      evidence,
      reportPath: join(qaWorkspace, "audio-report.json"),
      candidateSha256: artifacts[0].sha256,
      passed: true,
      report: qaFiles[0].content,
      perceptual: "REVIEW_INCOMPLETE" as const,
      listeningExercised: false as const,
    };
    const result = await submitVideoopsReview({
      agentsRepository: root,
      workspace,
      candidate,
      mandatoryCapabilities: ["visual_playback", "audio_listening"],
      audioQa,
    });
    expect(result.productionApproval).toBe("NOT_ESTABLISHED");
    const decision = JSON.parse(
      await readFile(join(workspace, "technical-decision.json"), "utf8"),
    );
    expect(decision.reviewer.type).toBe("technical_tool");
    expect(decision.perceptual).toBe("NOT_REVIEWED");
    expect(decision.evidence).toContain("audio-qa/audio-report.json");
    expect(decision.evidence).toContain("audio-qa/mix-declarations.json");
    const saved = JSON.parse(
      await readFile(join(workspace, "audio-qa/evidence.json"), "utf8"),
    );
    expect(saved.candidateSha256).toBe(artifacts[0].sha256);
    expect(saved.files[0].sha256).toBe(evidence[0].sha256);
    expect(
      await readFile(join(workspace, "audio-qa/audio-report.json")),
    ).toEqual(await readFile(join(qaWorkspace, "audio-report.json")));
    expect(command.mock.calls[1][1]).toContain("audio_listening");
    expect(command.mock.calls.some((c) => c[1].includes("promote"))).toBe(
      false,
    );
    await writeFile(join(qaWorkspace, "audio-report.json"), "tampered");
    await expect(
      submitVideoopsReview({
        agentsRepository: root,
        workspace: join(root, "bad-audio"),
        candidate,
        mandatoryCapabilities: ["visual_playback", "audio_listening"],
        audioQa,
      }),
    ).rejects.toThrow("Audio QA evidence changed");
    await writeFile(join(directory, "output/draft.mp4"), "changed");
    await expect(
      submitVideoopsReview({
        agentsRepository: root,
        workspace: join(root, "bad"),
        candidate,
        mandatoryCapabilities: ["visual_playback"],
      }),
    ).rejects.toThrow("changed");
    expect(command).toHaveBeenCalledTimes(3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
