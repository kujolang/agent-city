# Completion-to-inspector latency

Five actual Dispatch executions invoke the SDK and retrieve the local RAG index.
The source example uses an offline model fixture: this measures the real observation
pipeline, not another live-AI product demonstration. The proxy holds each actual RAG
response until start is observed, then releases it; completion timestamps are emitted
by the real source afterward. No production animation delays source work.

`proof.json` records19 selected terminal observations from those runs, preserving
source-qualified instance/event IDs and occurrence, gateway, browser receipt, DOM
match and visible-opportunity timestamps. Each observation must match its operation
ID and terminal status in the selected DOM inspector, then cross two animation
frames. This is a conservative browser paint opportunity, not physical GPU scanout.
Unselected observations before camera selection are explicitly excluded, not counted
as lost telemetry. Zero selected observations remained unpainted.

On this Mac with explicitly selected isolated Chromium151/SwiftShader:

| Metric | p50 | p95 | maximum |
| --- | ---: | ---: | ---: |
| Source completion → visible inspector opportunity |544ms|778ms|778ms|
| SSE receipt → visible inspector opportunity |44ms|76ms|76ms|

The latter meets the250ms inspector target in this bounded sample. Upstream timing
includes spool/bridge, canonical Watchdog intake/export, gateway polling/SQLite/SSE.
It is measured directly, not constructed by adding unrelated click-time percentiles.
The sample does not measure arbitrary load, every GPU or long-duration behavior.
Raw observations include source→gateway timing separately. All owned source/UI
services stopped after the run; no cloud model, container or eight-hour soak ran.

Reproduce with `CITY_LATENCY_SOFTWARE=1 npx tsx scripts/runtime-latency-proof.ts`
using the pinned local producer repositories/runtime. Omit the flag to measure the
browser's default backend. The explicit software flag affects only this trusted
local proof browser; it does not alter user browser or app defaults.

Independent installed-platform CI37776849191 at90478e5 passes all five jobs.
Linux x64 records20 terminal observations, completion→visible p50/p95395/580ms
and SSE→visible34/55ms. Linux ARM64 records20, completion→visible338/450ms and
SSE→visible35/48ms. Both have zero unpainted selected observations. Receipts are
under37776849191/. The preceding CI37776106779 ARM job failed because Chromium
was absent; installation and Workcell passed, and the missing browser prerequisite
was fixed explicitly before this successful rerun. No failed measurement is
reported as semantic loss or silently skipped.
