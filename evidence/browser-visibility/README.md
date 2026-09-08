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
