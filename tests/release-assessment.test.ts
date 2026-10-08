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
  status: "COMPLETED",
  deliveryReconciled: true,
  browserCaughtUp: true,
  visibleEventsPerSecond: 1000,
  sendSeconds: 60,
  accepted: 60000,
  visible: 60000,
  missing: 0,
  duplicates: 0,
};
describe("release evidence cannot overclaim qualification", () => {
  it("requires an observed native hidden/visible cycle and retained state", () => {
    const visibility = {
      windows: { sameWindow: true },
      hidden: {
        visibility: "hidden",
        selected: "source:worker",
        order: 13,
        queued: 1,
      },
      resumed: {
        selected: "source:worker",
        order: 13,
        queued: 0,
        rendererReady: true,
        visibilityEvents: ["hidden", "visible"],
      },
      hiddenTicksPaused: true,
      hiddenTruthUpdated: true,
      backlogCollapsed: true,
      selectedIdentityRetained: true,
      errors: [],
    };
    expect(assessRelease({ visibility }).gates.hiddenTabResume.status).toBe(
      "PASS",
    );
    for (const change of [
      { hiddenTicksPaused: false },
      { hiddenTruthUpdated: false },
      { errors: ["crash"] },
      { hidden: { ...visibility.hidden, visibility: "visible" } },
      { windows: { sameWindow: false } },
      ...[
        { selected: "another:worker" },
        { order: 12 },
        { queued: 1 },
        { rendererReady: false },
        { visibilityEvents: ["visible"] },
        { visibilityEvents: ["visible", "hidden"] },
      ].map((delta) => ({ resumed: { ...visibility.resumed, ...delta } })),
    ])
      expect(
        assessRelease({ visibility: { ...visibility, ...change } }).gates
          .hiddenTabResume.status,
      ).toBe("FAIL");
    expect(assessRelease({}).gates.hiddenTabResume.status).toBe(
      "NOT_QUALIFIED",
    );
  });
  it("requires applied native zoom, layout and keyboard evidence", () => {
    const zoom = {
      method: "chrome.tabs.setZoom",
      errors: [],
      restored: true,
      baseline: { dpr: 1 },
      cases: [1, 1.25, 2].map((factor) => ({
        factor,
        actual: factor,
        dpr: factor,
        keyboard: true,
        focused: true,
        overflow: false,
        roster: 3,
      })),
    };
    expect(assessRelease({ zoom }).gates.browserZoom.status).toBe("PASS");
    for (const change of [
      { method: "CDP pageScaleFactor" },
      { restored: false },
      { baseline: { dpr: 2 } },
      { cases: zoom.cases.slice(0, 1) },
      { cases: {} },
      { cases: [null] },
    ]) {
      expect(
        assessRelease({ zoom: { ...zoom, ...change } }).gates.browserZoom
          .status,
      ).toBe("FAIL");
    }
  });
  it("requires observed context loss and restoration beyond an initialization flag", () => {
    const renderer = {
      contextLoss: {
        extensionAvailable: true,
        domUsable: true,
        rendererReady: true,
      },
      initializationFailure: { fallback: "DOM fallback", roster: 3 },
    };
    expect(assessRelease({ renderer }).gates.rendererRecovery.status).toBe(
      "FAIL",
    );
    expect(
      assessRelease({
        renderer: {
          ...renderer,
          contextLoss: {
            ...renderer.contextLoss,
            lossObserved: true,
            contextRestored: true,
          },
        },
      }).gates.rendererRecovery.status,
    ).toBe("PASS");
  });
  it("keeps cancelled long-duration coverage unqualified even with passing throughput", () => {
    const result = assessRelease({ stress, pipeline });
    expect(result.gates.journalThroughput.status).toBe("PASS");
    expect(result.gates.endToEndStress.status).toBe("PASS");
    expect(result.gates.eightHourSoak.status).toBe("NOT_QUALIFIED");
    expect(result.status).toBe("CONDITIONAL");
  });
  it("rejects a fast short burst, missing deliveries and duplicated deliveries", () => {
    for (const delta of [
      { status: "FAILED" },
      { deliveryReconciled: false },
      { browserCaughtUp: false },
      { sampleError: "offline timeout" },
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
  it("requires a successful reconnect independently from passing throughput", () => {
    const reconnect = { ...pipeline, verifiedReconnects: 1 };
    expect(assessRelease({ reconnect }).gates.reconnectUnderLoad.status).toBe(
      "PASS",
    );
    for (const delta of [
      { verifiedReconnects: 0 },
      { status: "FAILED" },
      { sampleError: "timeout" },
      { browserCaughtUp: false },
      { missing: 1 },
    ]) {
      expect(
        assessRelease({ pipeline, reconnect: { ...reconnect, ...delta } }).gates
          .reconnectUnderLoad.status,
      ).toBe("FAIL");
    }
    expect(assessRelease({ pipeline }).gates.reconnectUnderLoad.status).toBe(
      "NOT_QUALIFIED",
    );
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
