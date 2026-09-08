# Canonical serialization reuse — 2026-09-08

Watchdog commit 52d581f reuses validated canonical bytes and hashes within one bounded batch. Conflict checking, insertion, privacy projection and legacy digest backfill retain their contracts. Source changes are confined to the mirrored telemetry repository and its existing identity fixture; no Kujo runtime changes.

A bounded synthetic comparison ran `PIPELINE_SECONDS=1 PIPELINE_RATE=300 CITY_PIPELINE_OUTPUT=... npx tsx scripts/pipeline-blockers.ts` before and after. Each sent 300 metadata events through actual HTTP intake, Watchdog export, gateway and SSE. Both accepted and displayed all 300, with zero missing or duplicates.

| Measurement | Before | After |
|---|---:|---:|
| Total delivery seconds | 5.124 | 4.031 |
| Visible events/second | 58.553 | 74.420 |
| Batch intake p50 ms | 1644.145 | 1322.949 |
| Batch intake p95 ms | 1782.464 | 1329.063 |

Only three batches per run; this is a small optimization observation, not a throughput qualification or reliable latency distribution. The host has many competing applications. The offered one-second workload took longer to deliver; 1,000 events/second for 60 seconds remains unproven. No soak ran, and this is synthetic stress evidence rather than primary product proof.

The after.json captured the pre-commit HEAD while the tested change was in the working tree; its source is now committed as 52d581f. Watchdog owner identity-conflict and telemetry API suites passed. The new fixture checks mixed duplicate/new insertion, persisted canonical bytes/hash equivalence and legacy digest backfill. Compatibility source mirrors are identical.
