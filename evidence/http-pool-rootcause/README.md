# HTTP connection worker reservation

Diagnostic CI37712695884 (Citye8010d8, released Kujo1.7.0) shows the first
batch300 entering Watchdog policy at29,992ms, while batches0/100/200 all finished
by518ms. Once admitted, batch300's repository transaction completed in about23ms.
Browser reconnect succeeded. This narrows the earlier source-side timeout; it is
not evidence of a30second SQLite write or a passing load test.

A bounded regression against Kujo's bundled tiny_http reproduces a worker
reservation race: queued long-lived connections already occupy the ostensibly
idle workers, but the allocator ignored queue length. A subsequent connection can
remain queued until another closes. The test fails before the fix and passes
immediately afterward, always releasing its owned waiting tasks.

Kujo commit853ad9c61ab7ba09bfa58f65c6d292cd622644a7 changes the allocation condition
and includes this regression in normal Cargo tests. Seventeen targeted tests pass
(reservation, route concurrency, callbacks and uploads), including VM/interpreter
HTTP contracts. Cargo formatting passes. No telemetry schema or language redesign.

The installer still pins released Kujo1.7.0. The source fix is not a published
runtime release and does not close distribution qualification. A separate bounded
candidate workflow builds the immutable patched source and records its actual
runtime version/hash. Candidate receipts cannot pass the public release gate.
The candidate result and subsequent released-runtime qualification are pending.

Agent City also applies a scoped compatibility policy: short Watchdog canonical
intake/export requests explicitly close their HTTP connection after each response.
This avoids retaining legacy connection workers, without changing event content,
source execution, throughput targets or the browser's gateway SSE stream. The
stress feeder uses the same request policy as the real bridge. This is being
qualified against the existing1.7.0 pin; it does not require publishing the runtime
source fix. The separate patched-runtime candidate remains independent.

Released-runtime compatibility qualification subsequently passed CI37717824495:
66,000events and two browser reconnects on Linuxx64. See ../reconnect-load/README.md.
The public installer still uses released1.7.0 plus the scoped City connection
policy; it does not silently substitute an unpublished Kujo runtime build.
