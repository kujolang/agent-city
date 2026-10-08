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
