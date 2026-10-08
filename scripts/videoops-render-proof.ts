/** Original render fixture. Actual isolated Workcell, not a model production demo. */
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { saveVideoopsAttempt } from "../apps/runner/videoops-artifacts";
import { submitVideoopsReview } from "../apps/runner/videoops-review";
import { renderVideoopsAttempt } from "../apps/runner/videoops-render";
const root = resolve(import.meta.dirname, "..");
const image = process.env.CITY_VIDEOOPS_IMAGE;
assert(
  /^sha256:[a-f0-9]{64}$/.test(image || ""),
  "Set the immutable local CITY_VIDEOOPS_IMAGE explicitly",
);
const runtime = resolve(root, ".runtime/videoops-render-" + Date.now());
await mkdir(runtime, { recursive: true, mode: 0o700 });
const request = {
  schema: "agent-city.videoops-render-input.v1",
  width: 640,
  height: 360,
  fps: 30,
  durationSeconds: 3,
  composition: {
    schema: "agent-city.videoops-artifacts.v1",
    files: [
      {
        path: "production/hyperframes/index.html",
        content:
          '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#070b16}#root{width:640px;height:360px;background:#070b16;color:#ffffff;overflow:hidden;position:relative}.clip{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}.label{font:32px monospace;text-align:center;color:#ffffff}</style></head><body><div id="root" data-composition-id="fixture" data-width="640" data-height="360" data-duration="3"><div class="clip" data-start="0" data-duration="3" data-track-index="0"><div class="label">VIDEOOPS RENDER CHECK</div></div></div><script src="./gsap.min.js"></script><script>window.__timelines["fixture"]=gsap.timeline({paused:true}).fromTo(".label",{opacity:0,y:12},{opacity:1,y:0,duration:0.3}).to(".label",{x:8,duration:0.2},2.8);</script></body></html>',
      },
      {
        path: "production/production-notes.md",
        content:
          "Original controlled silent render fixture; no creative approval or model authorship claimed.",
      },
    ],
  },
};
const editor = await saveVideoopsAttempt({
  workspace: runtime,
  stage: "hyperframes-editor",
  attempt: 1,
  execution: "fixture:videoops-render-fixture:hyperframes-editor",
  bundle: request.composition,
});
const rendering = resolve(runtime, "render-1");
const out = resolve(
  process.env.CITY_VIDEOOPS_PROOF_OUTPUT ||
    resolve(root, "evidence/videoops-render"),
);
await mkdir(out, { recursive: true });
try {
  const candidate = await renderVideoopsAttempt({
    root,
    runtime: rendering,
    image: image!,
    editor,
    producer: "videoops-render-fixture",
    run: "videoops-render-fixture",
    task: "videoops-render-fixture",
    spool: resolve(runtime, "spool.jsonl"),
    width: request.width,
    height: request.height,
    fps: request.fps,
    durationSeconds: request.durationSeconds,
  });
  const review = await submitVideoopsReview({
    agentsRepository: resolve(root, "../kujo-agents"),
    workspace: resolve(runtime, "review-1"),
    candidate,
    mandatoryCapabilities: ["visual_playback"],
  });
  assert.equal(review.status.state, "REVIEW_INCOMPLETE");
  assert.equal(review.status.technical, "PASS");
  assert.equal(review.status.perceptual, "NOT_REVIEWED");
  assert.equal(review.status.counters.render_attempts, 1);
  await writeFile(resolve(out, "review.json"), JSON.stringify(review, null, 2));
} catch (error) {
  for (const name of ["private-process.json", "failed.json", "lineage.json"])
    await copyFile(resolve(rendering, name), resolve(out, name)).catch(
      () => {},
    );
  throw error;
}
await copyFile(
  resolve(rendering, "private-process.json"),
  resolve(out, "process.json"),
);
await copyFile(
  resolve(rendering, "candidate.json"),
  resolve(out, "candidate.json"),
);
const proof = JSON.parse(
  await readFile(resolve(rendering, "workcell-proof.json"), "utf8"),
);
assert(proof.evidence?.runId);
const artifacts = resolve(
  rendering,
  "workcell-source/.workcell/runs",
  proof.evidence.runId,
  "artifacts",
);
const metadata = JSON.parse(
  await readFile(resolve(artifacts, "output/metadata.json"), "utf8"),
);
assert.equal(metadata.technical, "passed");
assert.equal(metadata.perceptual, "NOT_REVIEWED");
assert.equal(metadata.request.width, 640);
assert.equal(metadata.request.height, 360);
assert.equal(metadata.request.durationSeconds, 3);
assert.equal(
  metadata.artifact.sha256,
  proof.evidence.artifacts.find((a: any) => a.name === "output/draft.mp4")
    .sha256,
);
await copyFile(
  resolve(artifacts, "output/draft.mp4"),
  resolve(out, "draft.mp4"),
);
await writeFile(
  resolve(out, "proof.json"),
  JSON.stringify(
    {
      scope:
        "Actual network-disabled Workcell/HyperFrames render of original controlled fixture, not agent model production",
      image,
      workcell: proof.evidence,
      summary: proof.summary,
      metadata,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    status: "PASS",
    workcell: proof.evidence.runId,
    output: out,
  }),
);
