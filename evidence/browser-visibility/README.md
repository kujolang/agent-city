# Native visibility qualification — 2026-09-08

NOT QUALIFIED. The local headed Chromium automation did not reach the asserted
`document.visibilityState === "hidden"` state within ten seconds. No resume,
backlog-collapse or selected-identity claim is supported by this run.

The bounded diagnostic in scripts/browser-visibility-proof.ts starts an isolated
Vite server and an owned Chromium window, with synthetic transport only. It tries
native CDP tab activation, asserts visibility before injecting observations, then
would check paused ticks, updated truth, collapsed backlog and retained identity.
A 60-second deadline closes owned resources. It performs no model/source work.

Earlier attempts using Playwright page activation and window minimize also timed
out. Playwright's installed core enables focus emulation and disables background
throttling by default. Disabling those overrides did not resolve this environment's
failure to report hidden state; do not treat the overrides as a proven root cause.
Logs preserve each attempt. failure.json records the final browser-observed state.

A manual native browser check remains needed: select a specific execution, follow
it, hide the city tab while actual observations arrive, then return and verify that
truth is current, queued travel collapses and selection is unchanged. Do not use a
JavaScript replacement of document.hidden as native browser qualification. The
separate controlled connection/replay regression remains passing and narrower.

No production code changed. Typecheck passes. Release qualification is unchanged;
no eight-hour soak was started or scheduled.

## Native-window / default-override investigation, 2026-09-08

A fresh persistent profile confirmed matching native window IDs for source and cover tabs, but Chromium 151 still reported the source visible and emitted no visibility events. See persistent-window-failure.json. Thus separate windows do not explain that result.

Installed Playwright types expose connectOverCDP noDefaults, and its implementation skips default focus emulation in that mode. A separately spawned Chrome with its own private profile and loopback CDP endpoint was tested twice: initial load stalled, then explicit bringToFront plus DOMContentLoaded still timed out. These are preserved in no-defaults-navigation-failure.json and no-defaults-foreground-failure.json. They do not establish a product failure or the original visibility cause.

The diagnostic now records/asserts shared-window identity. Optional CITY_VISIBILITY_NO_DEFAULTS=1 reproduces the alternative attachment mode; the default uses the tested persistent-profile setup. Both are bounded to 60 seconds and close their owned browser. Do not repeat these unchanged runs on this host. Native visibility qualification requires an actual successful hidden/visible cycle in a different browser environment or a supervised manual test; controlled transport/recovery evidence does not substitute for it. No semantic events were injected in these failed runs. Typecheck passed; no product source changed.
