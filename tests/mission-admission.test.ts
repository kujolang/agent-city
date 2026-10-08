import { expect, test } from "vitest";
import {
  admissionHeld,
  releaseAdmission,
} from "../apps/runner/mission-admission";
test("operator queue release never changes or fabricates an execution outcome", () => {
  const job = Object.freeze({ id: "mission-a", status: "unknown" });
  expect(admissionHeld(job)).toBe(true);
  for (const ack of [false, undefined, "true", 1])
    expect(() => releaseAdmission(job, ack, "2026-10-08T00:00:00Z")).toThrow();
  const decision = releaseAdmission(job, true, "2026-10-08T00:00:00Z");
  expect(admissionHeld({ ...job, admissionRelease: decision })).toBe(false);
  expect(job.status).toBe("unknown");
  expect(job).not.toHaveProperty("finishedAt");
  expect(
    admissionHeld({
      ...job,
      admissionRelease: { ...decision, missionId: "other" },
    }),
  ).toBe(true);
  expect(
    admissionHeld({
      ...job,
      admissionRelease: { ...decision, occurredAt: "bad" },
    }),
  ).toBe(true);
  for (const status of ["running", "completed", "failed"])
    expect(() =>
      releaseAdmission({ ...job, status }, true, "2026-10-08T00:00:00Z"),
    ).toThrow();
});
