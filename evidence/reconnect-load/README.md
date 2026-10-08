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
