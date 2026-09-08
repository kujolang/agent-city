# Canonical intake phase profile — 2026-09-08

`scripts/profile-canonical-intake.ts` copies Watchdog's Kujo modules to an ignored runtime directory and adds wall-clock timing wrappers there. It does not modify or install instrumentation in the producer repository. Three synthetic 100-record batches exercise the copied server on loopback with temporary tokens and a private database. Source hashes are in the report. No model calls or source business execution occur.

The initial harness loaded the original imported module because its cwd was the owner repository. Its assertion rejected incomplete timing coverage. Running with the copied-module directory as cwd resolved it; the pre-fix log is retained. This is a resolved harness failure, not a product incident.

Before: each batch triggered two validation passes. Watchdog commit 314698b removes the route's duplicate full validation, handles the repository's validation errors as HTTP 400, and preserves HTTP 409 conflicts. Raw container bounds and privacy projection still run before repository validation, which precedes the database transaction. No unchecked repository entry point was added.

After: exactly one validation pass per batch; phase wall times were privacy 381–416 ms, validation 217–235 ms, parent graph 6–9 ms, identity/persistence 485–506 ms. These are three instrumented samples with host contention and warm-up effects, not reliable percentiles. before.json and proof.json capture source hashes; the latter ran the then-uncommitted change now stored in 314698b.

A separate uninstrumented synthetic pipeline delivered 300 of 300 records through actual Watchdog export, gateway and SSE, with 0 missing and 0 duplicates. Total measured delivery 3.686 seconds, 81.391 events/second. See pipeline.json. The offered one-second workload took longer to deliver. This does not qualify 1,000 events/second for 60 seconds. No soak ran.

Owner telemetry API suite and identity-conflict suite passed, covering privacy canaries, malformed records, raw batch bounds, cursor exports, duplicate retry, legacy hash backfill and conflict rejection. Agent City typecheck passed. Remaining profiling targets are privacy and row/identity work; neither may be bypassed for speed.
