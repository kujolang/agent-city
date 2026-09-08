# Canonical intake bounds and short pipeline measurement — 2026-09-08

Watchdog cdd4d9b rejects raw canonical batches containing non-object records or more than 100 entries before privacy filtering. Previously filtering could discard entries and return HTTP 200 for the remaining subset. `before.log` reproduces a valid record plus null being accepted; `after.log` records the passing owner telemetry API suite, including privacy canaries, exports and new malformed/oversized batch assertions. Casefile: 2026-09-08-124551-citycanonicalpartialbatch.

The endpoint also reuses its already-filtered `approved` batch for persistence instead of filtering the original body twice. Repository semantic validation, transactional insertion, conflict detection and exporter delivery remain active. The source change is confined to the mirrored Watchdog endpoint, documentation and its API test.

Agent City pipeline diagnostics now refuse occupied test ports and bind Watchdog to loopback. No existing services were stopped. No model, business operation, browser or soak ran.

Short synthetic comparison (PIPELINE_SOAK=0, PIPELINE_SECONDS=2, PIPELINE_RATE=1100):

| Measurement | Baseline | After |
| --- | ---: | ---: |
| Accepted and visible | 1,600 | 1,700 |
| Missing / duplicate | 0 / 0 | 0 / 0 |
| Send duration | 32.592 s | 34.106 s |
| Visible events/s | 48.792 | 49.552 |
| Intake p50 | 2,027.621 ms | 1,728.948 ms |
| Intake p95 | 2,367.744 ms | 5,146.122 ms |

These were offered short bursts bounded by the harness's duration-plus-30-second send limit; they are NOT successful two-second workloads or 60-second stress qualifications. The host has many other applications running. A single sequential pair cannot establish a statistically meaningful speedup; p95 worsened. The full-path 1,000/s target remains unmet. Historical release evidence and gate status remain unchanged.

Provenance: baseline used Watchdog fadad4e. The after JSON records that same HEAD because it ran with the working source patch subsequently committed unchanged as cdd4d9b. Agent City harness changes are limited to port preflight and loopback bind. Typecheck, source-mirror comparison and owner telemetry API suite passed.
