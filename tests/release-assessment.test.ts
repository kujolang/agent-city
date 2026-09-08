import { describe, expect, it } from "vitest";
import { assessRelease } from "../scripts/release-assessment.ts";
const stress = {
  eventsPerSecond: 1000,
  durationSeconds: 60,
  accepted: 60000,
  count: 60000,
  dropped: 0,
};
const pipeline = {
  visibleEventsPerSecond: 1000,
  sendSeconds: 60,
  accepted: 60000,
  visible: 60000,
  missing: 0,
  duplicates: 0,
};
describe("release evidence cannot overclaim qualification", () => {
  it("keeps cancelled long-duration coverage unqualified even with passing throughput", () => {
    const result = assessRelease({ stress, pipeline });
    expect(result.gates.journalThroughput.status).toBe("PASS");
    expect(result.gates.endToEndStress.status).toBe("PASS");
    expect(result.gates.eightHourSoak.status).toBe("NOT_QUALIFIED");
    expect(result.status).toBe("CONDITIONAL");
  });
  it("rejects a fast short burst, missing deliveries and duplicated deliveries", () => {
    for (const delta of [
      { sendSeconds: 2 },
      { visible: 59999 },
      { duplicates: 1 },
      { visibleEventsPerSecond: Infinity },
    ]) {
      expect(
        assessRelease({ pipeline: { ...pipeline, ...delta } }).gates
          .endToEndStress.status,
      ).toBe("FAIL");
    }
  });
  it("rejects journal counts that disagree or omit the duration", () => {
    for (const delta of [{ count: 59999 }, { durationSeconds: undefined }])
      expect(
        assessRelease({ stress: { ...stress, ...delta } }).gates
          .journalThroughput.status,
      ).toBe("FAIL");
  });
  it("does not certify three unasserted browser cases or source success without an outage", () => {
    const result = assessRelease({
      browser: { errors: [], cases: [null, {}, {}] },
      recovery: { realOperation: { exitCode: 0 } },
    });
    expect(result.gates.browserMatrix.status).toBe("FAIL");
    expect(result.gates.rendererRecovery.status).toBe("FAIL");
    expect(result.gates.sourceIndependence.status).toBe("FAIL");
    expect(result.gates.browserZoom.status).toBe("NOT_QUALIFIED");
  });
  it("reports absent evidence as unqualified, never passing", () => {
    const result = assessRelease({});
    expect(
      Object.values(result.gates).every((g) => g.status === "NOT_QUALIFIED"),
    ).toBe(true);
    expect(result.status).toBe("CONDITIONAL");
  });
});
