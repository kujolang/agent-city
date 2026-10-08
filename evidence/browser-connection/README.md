# Connection / replay isolation — 2026-09-08

Fixed an asynchronous race in the actual web application: a snapshot or health poll started before entering Replay could finish afterward and replace pinned truth/REPLAY health. Overlapping reconnect requests could also create obsolete streams. Connection generations, snapshot cancellation and callback guards now reject obsolete results. Periodic health polling is single-flight. Reset-handler errors become STALE instead of an unhandled rejection.

`npx tsx scripts/browser-connection-proof.ts` exercises the running DOM application in Chromium with controlled snapshot delays and EventSource delivery, using the existing checksum-verified real replay bundle in evidence/world-levels/replay.json. It verifies delayed health, cancelled connection snapshots, obsolete world/reset/error callbacks, and exactly one open stream after returning live. No source execution or control writes occur. See proof.json and recovered.png.

This is controlled transport regression evidence, not native hidden-tab, browser UI zoom, GPU or new live-source qualification. Those gates remain unchanged. The first harness attempt failed because its injected TypeScript class was transformed before browser serialization; raw browser JavaScript fixes the harness. The initial log is retained in harness-before.log. The subsequent run passed with zero page errors and zero writes.

Verification: TypeScript, all 48 unit tests, production build, and bounded Chromium transport regression. No long-duration workload or soak was started. No sibling source changes.

The regression now also covers an apparently OPEN stream falling behind the
snapshot order. Periodic health checks reconnect at the authoritative cursor in
that case. The controlled test verifies convergence and one remaining open stream.
This was added after a real repair's browser observation timed out even though
its canonical journal held the terminal events; the original timeout's exact
cause remains unproven. See ../packaged-repair for the real outcome evidence.

Health and initial snapshot fetches now have five-second deadlines. Disconnecting cancels a pending health request, preventing the single-flight guard from remaining stuck across replay. The hanging-request regression passed in 6,087 ms; its pre-fix failure is retained in pending-health-before.log. Fresh unmocked source/transport verification is recorded in ../live-convergence.

2026-10-07: native browser offline events now close the current stream, cancel
pending observations and mark STALE immediately while retaining truth. Online
recovery requires a successful gateway snapshot. Chromium's actual offline/online
switch passed the bounded regression with replay isolation and one live stream.
The controlled transport fixture now explicitly repackages retained observations
against the current authored map; original historical replay bytes are unchanged.
Both checksums and the test map hash are in proof.json. Reduced motion holds replay
at its deterministic initial state during delayed-response assertions. This is not
qualification of replaying an old map with the current renderer.

CI37710144786's prior reconnect-under-load failure is retained privately in
.runtime/ci-reconnect-37710144786; both platforms exceeded the STALE deadline,
and x64 also encountered an intake timeout. These local checks do not supersede
that separate load qualification failure.

The next load run37711102809 still failed: synchronous per-event UI rebuilds
coincided with heavy DOM allocation (x64 CDP Nodes164,044 by30seconds). UI painting
now coalesces on animation frames and the roster retains unchanged profile/instance
buttons. Every event still reduces truth and plans semantic activity synchronously.
A100-event controlled browser burst proves immediate truth, zero synchronous log
rebuilds, retained roster nodes and eventual visible timeline. This optimizes
presentation only and does not claim the load/reconnect gate has passed.

Health polling now reads /api/world/status (epoch, order and source freshness),
not the entire accumulated agent/operation snapshot each second. Initial connection
and recovery still use the authoritative full snapshot. Shared gateway health
calculation prevents endpoint drift. Epoch changes trigger recovery even when a
replacement journal has a lower order. Controlled Chromium regression covers the
new metadata route, lower-order replacement, stale callbacks, hanging status reads,
replay isolation and100-event burst truth.93tests and build pass. Throughput impact
requires the separate live gateway/browser measurement.
