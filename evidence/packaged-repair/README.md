# Real packaged code repair — 2026-09-08

The UI Continue/repair action created mission-51b6f3f1-70b8-4c0c-a10c-9d5e16ab5093
from failed-check parent mission-c0f86c6f-5994-481f-9b01-6861194ea7f5. Parent/root
identity and the original three explicit cases were retained. The real coder and
reviewer produced a corrected module; the normal complete-fence unwrapping removed
its Markdown wrapper. Syntax and all three browser-worker function checks passed.
The original failed artifact was fetched again and compared structurally across all returned fields;
it is unchanged. See proof.json for actual responses, artifact, checks and truth.

The first browser wait timed out despite the gateway journal receiving all three
passed checks within 759–994 ms of producer occurrence. This is not a source-work
failure. The completed task was not rerun: CITY_REPAIR_RESUME reopened that exact
result and verified the real persisted truth in the browser. dojo.png shows both
FAIL and PASS. Source restart gaps remain explicitly partial. The live browser
failure's exact cause is not established by reopening it.

A separate client recovery hole was fixed: health polling now reconnects at the
snapshot cursor when an apparently OPEN SSE stream leaves browser order behind
the authoritative snapshot. The controlled browser-connection regression simulates
that condition and verifies catch-up with one stream, while preserving replay
isolation. This is regression evidence for recovery, not proof of the original
live timeout's exact cause. Native hidden-tab and full throughput qualification
remain open. The previously packaged archive does not contain this latest UI fix.

Reproduce a new real repair with scripts/packaged-repair-proof.ts and the existing
extraction. To inspect the completed repair without model execution, set
CITY_REPAIR_RESUME=mission-51b6f3f1-70b8-4c0c-a10c-9d5e16ab5093. The diagnostic is
bounded to five minutes and records shutdown. Both invocations exited their owned
services; the successful resumed check reports all six ports released.
