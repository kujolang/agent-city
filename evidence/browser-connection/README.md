# Connection / replay isolation — 2026-09-08

Fixed an asynchronous race in the actual web application: a snapshot or health poll started before entering Replay could finish afterward and replace pinned truth/REPLAY health. Overlapping reconnect requests could also create obsolete streams. Connection generations, snapshot cancellation and callback guards now reject obsolete results. Periodic health polling is single-flight. Reset-handler errors become STALE instead of an unhandled rejection.

`npx tsx scripts/browser-connection-proof.ts` exercises the running DOM application in Chromium with controlled snapshot delays and EventSource delivery, using the existing checksum-verified real replay bundle in evidence/world-levels/replay.json. It verifies delayed health, cancelled connection snapshots, obsolete world/reset/error callbacks, and exactly one open stream after returning live. No source execution or control writes occur. See proof.json and recovered.png.

This is controlled transport regression evidence, not native hidden-tab, browser UI zoom, GPU or new live-source qualification. Those gates remain unchanged. The first harness attempt failed because its injected TypeScript class was transformed before browser serialization; raw browser JavaScript fixes the harness. The initial log is retained in harness-before.log. The subsequent run passed with zero page errors and zero writes.

Verification: TypeScript, all 48 unit tests, production build, and bounded Chromium transport regression. No long-duration workload or soak was started. No sibling source changes.
