# Bounded blocker fixes — 2026-09-08

Release remains **FAIL** until full-path throughput and long-duration qualification pass. This pass deliberately avoids a broad Kujo/Watchdog performance rewrite.

## Fixed

- **Agent City journal throughput:** batch copy-on-write preserves individual-event ordering, immutable prior snapshots and the existing real-corpus semantic hash. 66,000 normalized synthetic events committed in 60.170 seconds: **1,096.889/sec**, zero missing. CPU 38.425 seconds. [Measurement](evidence/blockers/stress.json).
- **Watchdog store continuity:** a small additive export extension supplies persisted store epoch, retention bounds and hashes of the acknowledged/next cursor records. Server restart preserves identity; new-store replacement changes it; deleted anchors expose retention; rollback is detectable. Gateway stores the cursor, epoch and anchor atomically and explicitly resets with partial coverage on discontinuity. Signed cursor format and source business behavior are unchanged. Only Watchdog's mirrored server, one existing test and its tracing documentation changed.
- **Verification:** 25 tests, strict TypeScript and build pass. Watchdog's canonical telemetry API suite passes, including restart/replacement/retention checks. [Owner test](evidence/blockers/watchdog-continuity.log), [City checks](evidence/blockers/verify.log), [same real replay hash](evidence/blockers/replay-result.json).

## Still outside the small fix

The actual synthetic canonical HTTP intake → Watchdog → gateway → SSE test exposes a different bottleneck: **2,200 events in 32.873 seconds, 66.923/sec**, no missing or duplicate deliveries. Intake requests for 100 records took roughly 1.5 seconds. This does not meet the 1,000/sec full-path target. Improving that safely needs a separate Watchdog intake/profile investigation; it is not hidden by the faster City journal result. [Diagnostic](evidence/blockers/pipeline.json).

A browser-connected smoke test offered 50/sec and delivered all 3,000 records in 64.742 seconds. Browser and gateway both reached order 3,000 across 25 synthetic instances, health LIVE and no coverage gap. [Smoke evidence](evidence/blockers/soak-smoke.json). These synthetic workloads are separate from the existing real Kujo product proof.

## Eight-hour qualification

The new live-like harness supports eight hours of ongoing synthetic canonical HTTP intake through the real Watchdog/gateway/SSE and Chromium application. It records heap, DOM objects, queue sizes, journal growth, browser catch-up and periodic forced disconnect/recovery. It uses isolated databases, random local test credentials and disabled exporters. At 5 events/sec, the expected corpus is 144,000 metadata observations, including explicitly failed attempts.

The long run writes `.runtime/soak-latest.json` and is **not complete merely because it starts**. `npm run gate` checks its actual completion, counts, browser catch-up and sampling continuity. Progress stays in ignored runtime storage so the working tree remains clean. A process-start resource limit occurred during an earlier smoke launch; a subsequent serialized smoke succeeded. Machine sleep, process loss or missing samples must be reported honestly.

Run manually: `PIPELINE_SOAK=1 PIPELINE_SECONDS=28800 PIPELINE_RATE=5 npm run proof:pipeline`.

## Operating changes

Upgrade Watchdog alongside City: older Watchdog exports without continuity metadata are intentionally shown as unavailable/stale rather than accepted as continuous. Existing source receipts and historical partial gaps remain intact. No SDK, Dispatch, RAG, MCP, Eval or Kujo runtime changes were needed.

Use `npm run replay -- evidence/blockers/replay.json` for the current implementation pin. The older replay bundle remains historical evidence and its exact source hash is expected to reject a changed implementation.

## Active run / follow-up

Replacement soak started **2026-09-08 11:42:37 UTC**, PID **65887** at launch,
City code `60f93ae`, Watchdog `a639d9a`. Check process ownership before using the
PID. An early sample shows 25 instances, LIVE source health and an empty visual
queue. This is progress, not an eight-hour pass. The earlier aborted attempt is
preserved in `evidence/blockers/soak-aborted-heartbeat.json`.

The thread follow-up `review-agent-city-eight-hour-soak` is scheduled to review
actual completion and update the evidence/report. It must keep release status
failed while the full-path throughput target remains unmet.
