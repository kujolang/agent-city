# Bounded native normalization — 2026-09-08

Agent City's bridge now normalizes up to 16 pending lifecycle observations per Kujo process. It still calls Watchdog's existing native adapter separately for each event, preserving the prior batch/event identity shape and individually durable HTTP retry bodies. Groups flush at the end of each scanned spool without waiting for additional events. This is local bridge work, not another broker or a producer API change.

Each invocation has unique staging paths. Complete JSON bodies are renamed into their durable cache only after adapter success; partial output remains unacknowledged and retryable. Normal staging files are removed after completion/failure. Existing cached canonical bodies and sent markers remain compatible. Forced process death may leave ignored orphan staging files; existing session quota/STALE behavior still applies.

`scripts/bridge-batch-proof.ts` uses synthetic lifecycle metadata, the real Kujo/Watchdog native adapter, actual Watchdog intake/export and actual gateway. A local relay injects one failed response after Watchdog accepts a record. It also injects a partial normalization output followed by process failure. Results:

- First 35 observations required three normalizer processes. The prior source launched one per event (35); this is a process-count comparison, not a before/after timing benchmark.
- All 36 observations reached gateway truth; operation order/occurrence times were preserved.
- One accepted response failure produced one byte-identical retry (37 HTTP requests total); repeated scans added no requests.
- Partial normalization output was not promoted; retry recovered it.
- Owned Watchdog/gateway ports closed at test completion.
- TypeScript passed. The 52-test suite passed during this change; the final focused bridge proof passed after invocation-specific staging was added.

This does not fix or qualify the separately measured canonical intake bottleneck, nor satisfy 1,000 events/second for 60 seconds. No real model request or soak ran. No sibling repository files changed. The 8087ded archive predates this bridge change and must not be described as containing it.
