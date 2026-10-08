import { test, expect } from "vitest";
import {
  validateVideoopsMission,
  videoopsMissionOutcome,
} from "../apps/runner/videoops-mission";
test("video request cannot grant profiles, paths or execution implicitly", () => {
  const request = {
    workflow: "videoops",
    prompt: "Retain this entire request",
    width: 640,
    height: 360,
    fps: 30,
    durationSeconds: 6,
    allowRender: true,
  };
  expect(validateVideoopsMission(request).prompt).toBe(request.prompt);
  for (const extra of [
    { allowRender: false },
    { image: "sha256:untrusted" },
    { capabilities: [] },
    { workspace: "/tmp" },
    { durationSeconds: 61 },
    { width: 1920, height: 1920 },
  ])
    expect(() => validateVideoopsMission({ ...request, ...extra })).toThrow();
});
test("video receipt distinguishes review pending, failed gates and uncertain source work", () => {
  const receipt = {
    schema: "agent-city.videoops-mission.v1",
    id: "mission-fixture",
    kind: "videoops",
    startedAt: "2026-10-08T00:00:00Z",
    finishedAt: "2026-10-08T00:01:00Z",
    status: "review-pending",
    productionStatus: "review-pending",
    code: 0,
  };
  expect(videoopsMissionOutcome(receipt, receipt.id)?.status).toBe(
    "review-pending",
  );
  expect(
    videoopsMissionOutcome({ ...receipt, status: "completed" }, receipt.id),
  ).toBeNull();
  expect(
    videoopsMissionOutcome(
      {
        ...receipt,
        status: "failed",
        productionStatus: "blocked",
        code: 1,
        uncertain: true,
      },
      receipt.id,
    ),
  ).toBeNull();
  expect(
    videoopsMissionOutcome(
      {
        ...receipt,
        status: "failed",
        productionStatus: "blocked",
        code: 1,
        uncertain: false,
      },
      receipt.id,
    )?.status,
  ).toBe("failed");
  expect(videoopsMissionOutcome(receipt, "other")).toBeNull();
});
