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
