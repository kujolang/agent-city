import { expect, test } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { prepareVideoops } from "../apps/runner/videoops-preparation";
import {
  saveVideoopsAttempt,
  videoopsOutputs,
} from "../apps/runner/videoops-artifacts";
import type { ImportedProfile } from "../apps/runner/agent-catalog";
const digest = createHash("sha256").update("fixture").digest("hex");
function profile(stage: string): ImportedProfile {
  return {
    id: "kujolang/kujo-agents:videoops." + stage,
    sourceId: "videoops." + stage,
    name: "Fixture",
    team: "videoops",
    version: "1",
    permissions: {
      minimum: "PROPOSE",
      maximum: "PROPOSE",
      enforcement: "fixture",
    },
    capabilities: { required: ["filesystem"], recommended: [], optional: [] },
    tools: {},
    workflows: [],
    contracts: { agent: "fixture", skill: "fixture", manifest: {} },
    source: {
      repository: "kujolang/kujo-agents",
      path: stage,
      manifestHash: digest,
      agentHash: digest,
      skillHash: digest,
    },
  };
}
test("preparation repairs a failed planning gate before handing verified files to Scout", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-videoops-prep-"));
  const spool = join(workspace, "spool.jsonl");
  await writeFile(spool, "");
  const calls: string[] = [];
  try {
    const result = await prepareVideoops(
      {
        root: workspace,
        workspace,
        spool,
        producer: "fixture",
        run: "run1",
        task: "task1",
        planner: profile("creative-director"),
        scout: profile("asset-scout"),
        capabilities: {
          planner: [
            {
              capability: "filesystem",
              evidenceRef: "fixture:storage",
              authority: "runtime",
            },
          ],
          scout: [
            {
              capability: "filesystem",
              evidenceRef: "fixture:storage",
              authority: "runtime",
            },
          ],
        },
        model: {
          endpoint: "http://127.0.0.1:1/v1/chat/completions",
          model: "fixture-never-called",
          apiKey: "",
        },
        timing: { fps: 30, durationSeconds: 2 },
        verifiedAssets: {},
        intake: [
          "project-brief.md",
          "messaging.md",
          "audience.md",
          "constraints.md",
          "references.md",
          "platform.json",
        ].map((p) => ({
          path: "intake/" + p,
          content:
            p === "platform.json"
              ? '{"target_duration_seconds":2,"fps":30}'
              : "Controlled fixture",
        })),
      },
      async (options) => {
        calls.push(options.stage + ":" + options.attempt);
        if (options.stage === "asset-scout")
          expect(options.input).toContain("kujo.handoff/v1");
        const end = options.attempt === 1 ? 1 : 2;
        const files = videoopsOutputs[options.stage].map((path) => ({
          path,
          content: path.endsWith("shot-list.json")
            ? JSON.stringify({
                shots: [
                  {
                    id: "s1",
                    start: 0,
                    end,
                    duration: end,
                    purpose: "hook",
                    visual: "Typography",
                    priority: "required",
                  },
                ],
              })
            : path.endsWith("asset-requirements.json")
              ? '{"requirements":[]}'
              : path.endsWith("asset-manifest.json")
                ? '{"assets":[]}'
                : "Fixture prose",
        }));
        const artifact = await saveVideoopsAttempt({
          workspace,
          stage: options.stage,
          attempt: options.attempt,
          execution: options.producer + ":" + options.run + ":" + options.stage,
          bundle: { schema: "agent-city.videoops-artifacts.v1", files },
        });
        return {
          directory: artifact.directory,
          artifact,
          receipt: {
            schema: "agent-city.videoops-stage-receipt.v1",
            stage: options.stage,
            attempt: options.attempt,
            profile: options.profile.id,
            run: options.run,
            task: options.task,
            status: "artifacts-stored",
            reason: null,
            model: "fixture",
            underlyingModel: "UNKNOWN",
            code: 0,
            timedOut: false,
            artifact: artifact.receipt,
            productionApproval: "NOT_ESTABLISHED",
          },
        };
      },
    );
    expect(calls).toEqual([
      "creative-director:1",
      "creative-director:2",
      "asset-scout:1",
    ]);
    expect(result.status).toBe("ready-for-editor");
    expect(
      JSON.parse(
        await readFile(
          join(workspace, ".city-preparation/creative-director-1.json"),
          "utf8",
        ),
      ).status,
    ).toBe("failed");
    const events = (await readFile(spool, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(
      events
        .filter((e) => e.capability === "agent.handoff")
        .map((e) => e.phase),
    ).toEqual(["started", "finished"]);
    expect(
      events.find((e) => e.capability === "agent.handoff").metadata
        .relatedInstance,
    ).toBe("fixture:run1-asset-scout:asset-scout");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("uncertain provider execution does not trigger a retry or downstream Scout", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-videoops-uncertain-"));
  let calls = 0;
  try {
    const spool = join(workspace, "spool.jsonl");
    await writeFile(spool, "");
    const capability = [
      {
        capability: "filesystem",
        evidenceRef: "fixture:storage",
        authority: "runtime" as const,
      },
    ];
    const result = await prepareVideoops(
      {
        root: workspace,
        workspace,
        spool,
        producer: "fixture",
        run: "unknown-run",
        task: "task",
        planner: profile("creative-director"),
        scout: profile("asset-scout"),
        capabilities: { planner: capability, scout: capability },
        model: {
          endpoint: "http://127.0.0.1:1/v1/chat/completions",
          model: "unused",
          apiKey: "",
        },
        timing: { fps: 30, durationSeconds: 2 },
        verifiedAssets: {},
        intake: [
          "project-brief.md",
          "messaging.md",
          "audience.md",
          "constraints.md",
          "references.md",
          "platform.json",
        ].map((p) => ({
          path: "intake/" + p,
          content:
            p === "platform.json"
              ? '{"target_duration_seconds":2,"fps":30}'
              : "Fixture",
        })),
      },
      async (options) => {
        calls++;
        return {
          directory: workspace,
          artifact: null,
          receipt: {
            schema: "agent-city.videoops-stage-receipt.v1",
            stage: options.stage,
            attempt: options.attempt,
            profile: options.profile.id,
            run: options.run,
            task: options.task,
            status: "failed",
            reason: "Provider outcome unknown",
            model: "fixture",
            underlyingModel: "UNKNOWN",
            code: null,
            timedOut: true,
            artifact: null,
            productionApproval: "NOT_ESTABLISHED",
          },
        };
      },
    );
    expect(calls).toBe(1);
    expect(result.status).toBe("blocked");
    expect(result.stage).toBe("creative-director");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
