# Canonical concurrency checkpoint — 2026-10-07

Release gate: **FAIL**. Correctness repair passed; throughput remains below 1,000
normalized metadata events/sec for 60 seconds. These bounded synthetic probes
are separate from real agent product proof. No eight-hour soak was run.

## Repair and checks

Watchdog `8c512624782878cc607794add7b71f46781a45bf` isolates disk-backed
canonical request transactions on separate SQLite connections. Previously two
concurrent requests could fail with HTTP500 / nested SQLite transaction errors.
An archived pre-fix checkout fails the new regression with HTTP500; the fixed
checkout passes 160 records across four concurrent batches, concurrent retries,
409 identity conflict, exact stored counts and privacy canaries. The historical
red regression output reports HTTP500 but does not retain the inner SQLite error;
the earlier pipeline server log provided that diagnosis.

Passed: `tests/canonical_concurrency_check.js`, `tests/telemetry_v2_api_suite.js`,
`tests/telemetry_v2_identity_conflict_suite.js`, `tests/src_layout_compatibility_check.js`.
City TypeScript check passed. Private SQLite `:memory:` concurrency is unqualified.
The installer pins the repaired Watchdog revision. No producer business execution
or privacy/validation boundary was bypassed.

## Bounded pipeline result

See [pipeline.json](pipeline.json). Interpreter mode, two concurrent writers,
100 records/request, offered 1,100/sec. Requested duration10sec; the existing
safety cutoff plus in-flight work ended sending at41.25sec. Accepted5,800,
SSE-visible5,800, missing0, duplicate0; overall139.92/sec. Request latency
p50=1,381.80ms, p95=2,048.84ms. COMPLETED means delivery completed, not performance
acceptance. This is not a completed60-second target run or a browser-frame result.

Resource sample columns are PID, CPU-percent snapshot, RSSKiB. Row order is test
harness, Watchdog, gateway; child descendants are excluded. Two snapshots cannot
establish peak memory, CPU utilization over the run, or a leak trend. The user's
machine had other workloads; no isolated capacity claim is made.

Reproduce bounded profiling from City:

```sh
PIPELINE_SECONDS=10 PIPELINE_RATE=1100 PIPELINE_CONCURRENCY=2 \
CITY_PIPELINE_OUTPUT=.runtime/concurrent-check.json npx tsx scripts/pipeline-blockers.ts
```

Optional VM probes on the installed Kujo1.7.0 runtime timed out on their first
canonical request after30seconds, both before and after the isolation repair.
Root cause is unknown. Production remains interpreter mode. The harness now
sends SIGKILL to its own child after a2-second graceful-shutdown deadline; a
second VM probe verified forced cleanup and closed test ports. VM was exploratory,
not a qualified deployment alternative. Future output includes runtime version
and binary SHA256; these fields were added after the recorded probe.

Remaining: canonical hot-path profiling, sustained target stress, native browser
recovery qualification and all unchecked items in RELEASE-CHECKLIST.md. Do not
advertise production readiness from this repair.
