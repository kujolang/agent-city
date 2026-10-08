# Clean-host canonical throughput — 60 seconds

CI37709566358, Cityefa529d, Watchdogf463ced, pinned Kujo1.7.0. Both Linux x64
and ARM64 accepted and delivered66,000/66,000 synthetic metadata observations
through actual Watchdog canonical intake/export, SQLite gateway journal, SSE and
an actual Chromium client. Zero observed missing or duplicated SSE events; both
browsers caught up to the gateway's final semantic order.

| Platform | Visible events/sec | Send seconds | Intake p50/p95 ms |
| --- | ---: | ---: | ---: |
| Linux x64 | 1099.634 | 60.020 | 118.065 / 261.048 |
| Linux ARM64 | 1099.692 | 60.017 | 140.725 / 188.055 |

The unchanged1,000events/sec threshold passed. The source is synthetic stress
input, not product proof or a model task. These results qualify the measured clean
runner environments; they do not establish workstation performance or a causal
comparison with earlier local failures. This run did not force a client reconnect;
a subsequent qualification adds a forced outage during load. No eight-hour soak.

Watchdog moved bounded field/JSON/reference preparation before BEGIN IMMEDIATE.
Database identity reconciliation and writes remain inside the transaction. Local
concurrency, canonical API, repository, identity-conflict, observability semantics,
busy-writer fail-closed/retry and mirror regressions passed. Instrumented100record
samples moved approximately122–132ms of preparation outside the writer; observed
insertion time was62–67ms. Timing instrumentation is diagnostic, not this gate.

A separate local run aborted in the synthetic feeder's overlapping heartbeat
rename. The production bridge already writes sequentially. The harness now
serializes heartbeat and metric writes and records their errors. Private CaseFile:
2026-10-07-205018-stressheartbeatoverlap. No failed evidence is converted to PASS.
