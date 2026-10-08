import { test, expect } from "vitest";
import { mkdtemp, rm, realpath, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { produceVideoops } from "../apps/runner/videoops-production";
import { saveVideoopsAttempt } from "../apps/runner/videoops-artifacts";
const digest = createHash("sha256").update("fixture").digest("hex");
function profile(stage: string): any {
  return {
    id: "kujolang/kujo-agents:videoops." + stage,
    sourceId: "videoops." + stage,
    permissions: { minimum: "PROPOSE", maximum: "ACT" },
    capabilities: { required: [] },
    source: { agentHash: digest, skillHash: digest },
    contracts: { agent: "fixture", skill: "fixture" },
  };
}
for (const mode of ["pending", "media", "uncertain"] as const)
  test(
    "production gates " + mode + " without claiming final approval",
    async () => {
      const workspace = await realpath(
        await mkdtemp(join(tmpdir(), "city-production-")),
      );
      try {
        const calls: string[] = [];
        const options: any = {
          root: workspace,
          workspace,
          producer: "fixture",
          run: "run",
          task: "task",
          spool: join(workspace, "spool"),
          editor: profile("hyperframes-editor"),
          scout: profile("asset-scout"),
          editorCapabilities: [],
          agentsRepository: workspace,
          image: "sha256:" + "a".repeat(64),
          width: 640,
          height: 360,
          timing: { fps: 30, durationSeconds: 3 },
          mandatoryReview: ["visual_playback"],
          intake: [],
          verifiedAssets: {},
        };
        const dependencies: any = {
          prepare: async () => ({
            status: "ready-for-editor",
            stage: "asset-scout",
            attempts: [{ stage: "asset-scout", attempt: 2, status: "passed" }],
            plan: {
              bundle: {
                files: [
                  { path: "planning/creative-brief.md", content: "Fixture" },
                ],
              },
            },
            assets: {
              bundle: {
                files: [{ path: "assets/asset-manifest.json", content: "{}" }],
              },
              assets: mode === "media" ? [{ status: "FOUND" }] : [],
            },
          }),
          stage: async (o: any) => {
            calls.push("editor");
            expect(JSON.parse(o.input).handoff.next_owner).toBe(
              "fixture:run-hyperframes-editor:hyperframes-editor",
            );
            if (mode === "uncertain")
              return {
                artifact: null,
                receipt: {
                  status: "failed",
                  timedOut: true,
                  code: null,
                  reason: "Unknown provider outcome",
                },
              };
            const artifact = await saveVideoopsAttempt({
              workspace,
              stage: "hyperframes-editor",
              attempt: o.attempt,
              execution: "fixture:editor:1",
              bundle: {
                schema: "agent-city.videoops-artifacts.v1",
                files: [
                  {
                    path: "production/hyperframes/index.html",
                    content: "Fixture HTML",
                  },
                  {
                    path: "production/production-notes.md",
                    content: "Fixture",
                  },
                ],
              },
            });
            return {
              artifact,
              receipt: { status: "artifacts-stored", timedOut: false, code: 0 },
            };
          },
          render: async (o: any) => {
            calls.push("render");
            expect(o.editor.receipt.stage).toBe("hyperframes-editor");
            return { fixture: true };
          },
          review: async () => {
            calls.push("review");
            return { status: { state: "REVIEW_INCOMPLETE" } };
          },
        };
        const result = await produceVideoops(options, dependencies);
        expect(result.productionApproval).toBe("NOT_ESTABLISHED");
        if (mode === "uncertain") expect(result.uncertain).toBe(true);
        expect(result.status).toBe(
          mode === "pending" ? "review-pending" : "blocked",
        );
        expect(calls).toEqual(
          mode === "pending"
            ? ["editor", "render", "review"]
            : mode === "media"
              ? []
              : ["editor"],
        );
        if (mode !== "media") {
          const events = (await readFile(options.spool, "utf8"))
            .trim()
            .split("\n")
            .map((s) => JSON.parse(s));
          expect(events.map((e) => e.attempt)).toEqual([2, 2]);
          expect(events.at(-1).outcome).toBe(
            mode === "uncertain" ? "failed" : "succeeded",
          );
        }
        await expect(produceVideoops(options, dependencies)).rejects.toThrow();
      } finally {
        await rm(workspace, { recursive: true, force: true });
      }
    },
  );
