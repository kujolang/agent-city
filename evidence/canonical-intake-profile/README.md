# Canonical intake diagnosis

Synthetic batches of 1, 10 and 100 records, three rounds each, were sent directly
to a private loopback Watchdog instance. No gateway, browser or model was involved.
All 333 records in each diagnostic were accepted. The checked-in harness uses
bounded requests and shuts down its owned server.

The upstream remains a throughput bottleneck: 100-record requests took hundreds
of milliseconds before any Agent City projection. Native ordered JSON encoding
and native default-term matching avoid interpreted loops without changing the
canonical identity/privacy contract. Custom redaction terms retain literal matching.
Watchdog commits 4f55248 and 2066fd8; byte equivalence120cases, default/custom
redaction equivalence825cases, canonical API/privacy, concurrency, telemetry
redaction and root/src mirror checks passed.

Samples were taken under variable host load, sometimes with unrelated validation
running. They cannot establish a speedup ratio. Full canonical pipeline evidence
is separate; these changes do not make the 1,000events/sec release gate pass.

Latest bounded pipeline: requested60seconds at1,100events/sec, stopped sending
after91.147seconds under backpressure. All24,800 accepted observations reached
SSE, zero missing/duplicates,271.488visible events/sec. Intake p50=1341.791ms,
p95=2488.921ms (four concurrent100record batches). No browser was enabled in
this run. This FAILS the1,000/sec target; COMPLETED in the raw receipt only
means the harness finished. Variable host load prevents causal comparison.
