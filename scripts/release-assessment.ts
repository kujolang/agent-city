/** Evidence assessment only: never starts workloads or source operations. */
export type Gate = {
  status: "PASS" | "FAIL" | "NOT_QUALIFIED";
  reason: string;
};
type RecordData = Record<string, any>;
export function assessRelease(input: {
  stress?: RecordData;
  pipeline?: RecordData;
  reconnect?: RecordData;
  browser?: RecordData;
  renderer?: RecordData;
  zoom?: RecordData;
  visibility?: RecordData;
  recovery?: RecordData;
  continuity?: string;
}) {
  const { stress: s, pipeline: p, browser: b, recovery: r } = input;
  const gpu = input.renderer ?? b;
  const measured = (data: unknown, pass: boolean, reason: string): Gate => ({
    status: data == null ? "NOT_QUALIFIED" : pass ? "PASS" : "FAIL",
    reason,
  });
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  const atLeast = (n: unknown, floor: number) => finite(n) && n >= floor;
  const cases = Array.isArray(b?.cases) ? b.cases : [];
  const gates: Record<string, Gate> = {
    journalThroughput: measured(
      s,
      atLeast(s?.eventsPerSecond, 1000) &&
        atLeast(s?.durationSeconds, 60) &&
        atLeast(s?.accepted, 60000) &&
        s?.count === s?.accepted &&
        s?.dropped === 0,
      "Direct journal only: >=1,000 events/s for >=60 seconds, complete count, zero drops.",
    ),
    endToEndStress: measured(
      p,
      p?.status === "COMPLETED" &&
        p?.diagnostic !== true &&
        p?.runtimeCandidate !== true &&
        p?.deliveryReconciled === true &&
        p?.browserCaughtUp === true &&
        !p?.sampleError &&
        atLeast(p?.visibleEventsPerSecond, 1000) &&
        atLeast(p?.sendSeconds, 60) &&
        atLeast(p?.accepted, 60000) &&
        p?.visible === p?.accepted &&
        p?.missing === 0 &&
        p?.duplicates === 0,
      "Canonical Watchdog intake through gateway/SSE; short bursts cannot qualify the 60-second gate.",
    ),
    reconnectUnderLoad: measured(
      input.reconnect,
      input.reconnect?.status === "COMPLETED" &&
        input.reconnect?.diagnostic !== true &&
        input.reconnect?.runtimeCandidate !== true &&
        input.reconnect?.deliveryReconciled === true &&
        input.reconnect?.browserCaughtUp === true &&
        !input.reconnect?.sampleError &&
        atLeast(input.reconnect?.verifiedReconnects, 1) &&
        atLeast(input.reconnect?.sendSeconds, 60) &&
        atLeast(input.reconnect?.accepted, 60000) &&
        input.reconnect?.visible === input.reconnect?.accepted &&
        input.reconnect?.missing === 0 &&
        input.reconnect?.duplicates === 0,
      "Forced browser offline/online during bounded canonical load; recovered truth, reconciled delivery and no sample failures.",
    ),
    eightHourSoak: {
      status: "NOT_QUALIFIED",
      reason:
        "Cancelled by explicit user instruction. No soak is started, scheduled, or required by this command; long-duration reliability remains unqualified.",
    },
    browserMatrix: measured(
      b,
      Array.isArray(b?.errors) &&
        b.errors.length === 0 &&
        [1, 1.25, 2].every((dpr) => cases.some((c) => c?.dpr === dpr)) &&
        cases.some((c) => c?.width === 320) &&
        cases.some((c) => c?.reducedMotion === true) &&
        cases.length > 0 &&
        cases.every(
          (c) =>
            c?.keyboard === true &&
            c.overflow === false &&
            c.replayIsolated === true,
        ),
      "Recorded Chromium DPR, narrow viewport, keyboard, reduced-motion and replay cases; not a blanket browser certification.",
    ),
    rendererRecovery: measured(
      gpu,
      gpu?.contextLoss?.extensionAvailable === true &&
        gpu?.contextLoss?.lossObserved === true &&
        gpu?.contextLoss?.contextRestored === true &&
        gpu?.contextLoss?.domUsable === true &&
        gpu?.contextLoss?.rendererReady === true &&
        typeof gpu?.initializationFailure?.fallback === "string" &&
        gpu.initializationFailure.fallback.length > 0 &&
        atLeast(gpu?.initializationFailure?.roster, 1),
      "Observed lost/restored WebGL context and explicit renderer-init failure DOM fallback; ready flag alone is insufficient.",
    ),
    browserZoom: measured(
      input.zoom,
      input.zoom?.method === "chrome.tabs.setZoom" &&
        Array.isArray(input.zoom?.errors) &&
        input.zoom.errors.length === 0 &&
        input.zoom?.restored === true &&
        Array.isArray(input.zoom?.cases) &&
        [1, 1.25, 2].every((factor) =>
          input.zoom?.cases?.some(
            (c: RecordData) =>
              c?.factor === factor &&
              c.actual === factor &&
              c.keyboard === true &&
              c.focused === true &&
              c.overflow === false &&
              atLeast(c.roster, 1) &&
              finite(c.dpr) &&
              Math.abs(c.dpr / input.zoom!.baseline?.dpr - factor) < 0.02,
          ),
        ),
      "Native Chromium tab zoom at 100/125/200%, keyboard roster and no overflow; not browser-menu interaction. CDP page scaling alone cannot qualify.",
    ),
    hiddenTabResume: measured(
      input.visibility,
      input.visibility?.windows?.sameWindow === true &&
        input.visibility?.hidden?.visibility === "hidden" &&
        input.visibility?.hiddenTicksPaused === true &&
        input.visibility?.hiddenTruthUpdated === true &&
        input.visibility?.backlogCollapsed === true &&
        input.visibility?.selectedIdentityRetained === true &&
        typeof input.visibility?.hidden?.selected === "string" &&
        input.visibility.hidden.selected.length > 0 &&
        input.visibility?.resumed?.selected ===
          input.visibility.hidden.selected &&
        finite(input.visibility?.hidden?.order) &&
        input.visibility?.resumed?.order === input.visibility.hidden.order &&
        atLeast(input.visibility?.hidden?.queued, 1) &&
        input.visibility?.resumed?.queued === 0 &&
        input.visibility?.resumed?.rendererReady === true &&
        Array.isArray(input.visibility?.resumed?.visibilityEvents) &&
        input.visibility.resumed.visibilityEvents.includes("hidden") &&
        input.visibility.resumed.visibilityEvents.at(-1) === "visible" &&
        Array.isArray(input.visibility?.errors) &&
        input.visibility.errors.length === 0,
      "Short native hidden/visible cycle with paused animation, retained truth/identity and collapsed backlog; not OS sleep, tab discard or long-duration reliability.",
    ),
    sourceIndependence: measured(
      r,
      r?.realOperation?.exitCode === 0 &&
        r?.realOperation?.gatewayStopped === true &&
        atLeast(r?.realOperation?.spoolBytes, 1),
      "Actual source operation completed while gateway stopped; does not prove subsequent spool delivery.",
    ),
    watchdogStoreEpoch: measured(
      input.continuity,
      input.continuity?.trim() === "telemetry_v2_api_suite: PASS",
      "Recorded Watchdog canonical telemetry API suite result.",
    ),
  };
  const values = Object.values(gates);
  return {
    status: values.some((g) => g.status === "FAIL")
      ? "FAIL"
      : values.some((g) => g.status === "NOT_QUALIFIED")
        ? "CONDITIONAL"
        : "PASS",
    scope:
      "Assessment of recorded hardening evidence, not current-build or complete product certification",
    gates,
    limitations: [
      "Evidence is historical unless separately rerun against the current build.",
      "Competing host workloads can affect timings; they do not qualify a failed throughput gate.",
      "Visual fidelity, model quality, privacy and complete product acceptance require separate evidence.",
    ],
  };
}
