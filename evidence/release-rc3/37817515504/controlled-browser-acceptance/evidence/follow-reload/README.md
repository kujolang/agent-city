# Exact instance follow after reload

Controlled Chromium proof reproduces the pre-fix bug: an active agent.run in the
snapshot was not followed because the UI compared operation status to `running`
instead of the reducer's `active`. The pre-fix assertion received null rather than
`reload-mission-follow-fixture:run:worker`.

The fixed proof performs real page reloads and verifies exact instance restoration,
no auto-selection for completed or ambiguous same-mission executions, unchanged
truth, no page errors and zero source writes. It runs with renderer=off to cover
DOM fallback too. This is a fixture, not new real-agent activity. The separate
reviewed-tool video supplies real cross-portal Follow evidence. CI includes this
regression. `proof.json` records the browser/results; source is
`scripts/follow-reload-proof.ts`.

2026-10-08 follow-through: a separate failing case showed that a manually selected
execution disappeared on reload once it completed. Per-tab session storage now
retains only its source-qualified ID and Follow preference. The authoritative
snapshot must contain that exact ID; no role/name matching or persisted runtime
truth is used. Completed executions remain inspectable and stop following. Manual
unfollow survives reload, unavailable identities are ignored, and replay selection
does not overwrite the live preference. Six controlled cases pass on Chromium153
with unchanged truth, zero source writes and no page errors.
