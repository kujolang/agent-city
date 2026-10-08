# Bounded canonical batch lookup and browser qualification

Watchdog8893dcc batches existing-identity lookup (at most100 validated records),
uses SQLite INSERT RETURNING for the exact new ID, and removes a redundant DELETE
for a fresh AUTOINCREMENT ID. Transaction boundaries, producer scoping, canonical
hashes, privacy and conflict rejection remain unchanged. Regression retained240
records across concurrent requests, overlap retries and distinct producers, and
rejected mixed conflicting/new records atomically. Canonical API, serialization
and mirror tests passed. Direct100record intake samples were403,398,463ms; variable
host load means these do not establish a causal speedup or release qualification.

The browser stress qualification still FAILS. A60second/1,100eps requested run
with four senders hit a30second intake timeout.7,600 records were acknowledged
and observed at SSE sender stop, with four100record batches unreconciled. One
uncertain offset was300, while later offsets had completed; this supports
investigating writer starvation, but does not prove its cause. Both journal
integrity checks passed after the earlier failed attempt (Watchdog7,000 rows,
City6,700 rows). The failed runs shut down owned processes without forced cleanup.

The harness now drains and checks response bodies, waits for cancelled senders,
retains partial counters and uncertain batch offsets, and preserves the original
abort reason. It uses installed Chromium discovery instead of a personal cache
path. A separate10second/100eps single-sender browser smoke verifies that repaired
harness end-to-end; it is NOT a replacement for the failed throughput target.
CaseFile:2026-10-07-202516-browserpipelineintaketimeout (private local bundle).
