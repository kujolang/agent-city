import { expect, test } from "vitest";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import provenance from "../apps/runner/videoops-contracts/provenance.json";
import {
  validateVideoopsPlan,
  validateVideoopsAssets,
  validateVideoopsHandoff,
} from "../apps/runner/videoops-gates";
import { videoopsOutputs } from "../apps/runner/videoops-artifacts";
const timing = { fps: 30, durationSeconds: 4 };
function planBundle() {
  const shots = {
    shots: [
      {
        id: "a",
        start: 0,
        end: 2,
        duration: 2,
        purpose: "hook",
        visual: "copy",
        priority: "required",
        asset_requirement_ids: ["logo"],
      },
      {
        id: "b",
        start: 2,
        end: 4,
        duration: 2,
        purpose: "CTA",
        visual: "copy",
        priority: "required",
        asset_requirement_ids: [],
      },
    ],
  };
  const requirements = {
    requirements: [
      {
        id: "logo",
        type: "image",
        description: "Approved logo",
        required: true,
        used_by: ["a"],
      },
    ],
  };
  return {
    schema: "agent-city.videoops-artifacts.v1",
    files: videoopsOutputs["creative-director"].map((path) => ({
      path,
      content: path.endsWith("shot-list.json")
        ? JSON.stringify(shots)
        : path.endsWith("asset-requirements.json")
          ? JSON.stringify(requirements)
          : "Explicit fixture",
    })),
  };
}
function changePlan(fn: (v: any) => void) {
  const bundle = planBundle();
  const file = bundle.files.find((f) => f.path.endsWith("shot-list.json"))!;
  const data = JSON.parse(file.content);
  fn(data);
  file.content = JSON.stringify(data);
  return bundle;
}
const digest = "a".repeat(64);
function assets(status = "FOUND") {
  return {
    schema: "agent-city.videoops-artifacts.v1",
    files: videoopsOutputs["asset-scout"].map((path) => ({
      path,
      content: path.endsWith(".json")
        ? JSON.stringify({
            assets: [
              {
                id: "logo-image",
                requirement_id: "logo",
                type: "image",
                origin: "supplied",
                status,
                usage_status: "approved",
                acquisition_status: "resolved",
                used_by: ["a"],
                path: "assets/source/logo.png",
                sha256: digest,
              },
            ],
          })
        : "Fixture evidence",
    })),
  };
}
test("vendored upstream schemas retain pinned byte hashes", async () => {
  for (const [file, expected] of Object.entries(provenance.files)) {
    const bytes = await readFile(
      resolve("apps/runner/videoops-contracts", file),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected);
  }
});
test("planning covers exact frames with reciprocal asset mapping", () => {
  expect(validateVideoopsPlan(planBundle(), timing).gate.frames).toBe(120);
  for (const transform of [
    (v: any) => {
      v.shots[1].start = 2.5;
      v.shots[1].duration = 1.5;
    },
    (v: any) => {
      v.shots[1].end = 5;
      v.shots[1].duration = 3;
    },
    (v: any) => {
      v.shots[1].id = "a";
    },
    (v: any) => {
      v.shots[0].asset_requirement_ids = ["invented"];
    },
    (v: any) => {
      v.shots[0].asset_requirement_ids = [];
    },
    (v: any) => {
      v.shots[1].start = 1.99;
      v.shots[1].duration = 2.01;
    },
  ])
    expect(() => validateVideoopsPlan(changePlan(transform), timing)).toThrow();
  const overlap = changePlan((v) => {
    v.shots[1].start = 1.5;
    v.shots[1].duration = 2.5;
    v.shots[1].transition_in = "crossfade";
  });
  expect(validateVideoopsPlan(overlap, timing).gate.status).toBe("passed");
});
test("asset claims need real acquired-byte and rights evidence; unresolved assets route honestly", () => {
  const plan = validateVideoopsPlan(planBundle(), timing);
  expect(() => validateVideoopsAssets(assets(), plan, {})).toThrow(
    "acquired bytes",
  );
  const verified = {
    "logo-image": {
      path: "assets/source/logo.png",
      sha256: digest,
      rightsEvidence: "operator:approved-logo",
    },
  };
  expect(validateVideoopsAssets(assets(), plan, verified).status).toBe(
    "ready-for-editor",
  );
  expect(validateVideoopsAssets(assets("GENERATE"), plan, {}).status).toBe(
    "generation-required",
  );
  expect(validateVideoopsAssets(assets("BLOCKED"), plan, {}).status).toBe(
    "blocked",
  );
  expect(() =>
    validateVideoopsAssets(assets("NOT_REQUIRED"), plan, {}),
  ).toThrow("Required");
  expect(() =>
    validateVideoopsAssets(assets(), plan, {
      "logo-image": { ...verified["logo-image"], sha256: "b".repeat(64) },
    }),
  ).toThrow();
});
test("handoff cannot replace role identity or omit accepted artifacts", () => {
  const h = {
    schema: "kujo.handoff/v1",
    assignment: "run:planning",
    current_owner: "source:planner",
    next_owner: "source:scout",
    goal: "Resolve approved assets",
    scope: "Supplied assets only",
    artifacts: ["planning/shot-list.json"],
    evidence: ["gate:plan"],
    decisions: [],
    unresolved_questions: [],
    allowed_next_actions: ["resolve-assets"],
    stop_condition: "Return a validated manifest",
  };
  const expected = {
    owner: h.current_owner,
    nextOwner: h.next_owner,
    artifacts: h.artifacts,
    evidence: h.evidence,
  };
  expect(validateVideoopsHandoff(h, expected)).toEqual(h);
  expect(() =>
    validateVideoopsHandoff({ ...h, artifacts: [] }, expected),
  ).toThrow();
  expect(() =>
    validateVideoopsHandoff({ ...h, current_owner: "display-name" }, expected),
  ).toThrow();
});
