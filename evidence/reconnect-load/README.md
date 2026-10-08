# Bounded reconnect qualification

CI37711102809 at City73d0498 / Watchdogf463ced failed on Linux x64 and ARM64.
The actual browser offline→STALE check timed out on both. x64 additionally timed
out canonical intake; ARM64 delivered66,000 events but failed browser catch-up.
Receipts remain in37711102809/{x64,arm}.json, with uncertain intake batches and
errors preserved. No eight-hour soak and no real model calls were made.

This is separate from the passing throughput-only CI37709566358 in
../clean-throughput. Release assessment now requires a separate successful
reconnect measurement and rejects FAILED/incomplete pipeline receipts even when
numeric throughput meets the threshold. DOM painting optimization is pending
fresh load qualification; controlled tests cannot establish that gate.


Latest CI37711890418 at497186c / Watchdogf463ced:
- Linux ARM64 PASS:66,000/66,000,zero missing/duplicates,1097.797events/sec over
  60.020s, two verified offline/online recoveries, final browser truth caught up.
- Linux x64 FAIL: one browser recovery succeeded with no sampling error, but
  canonical intake timed out.23,600records acknowledged;23,300observed when the
  sender stopped. Four100record batches remain uncertain, including offset300
  from the initial concurrent requests. This is not reconciled delivery.

The current release gate consumes that x64 failure and stays FAIL. The early
request remaining unresolved while later requests complete suggests starvation,
but the blocked source stage has not been proven. Do not convert it into a
SQLite-lock diagnosis without stage evidence. Four-platform installation CI
37711883473 at the same City revision passed separately.
