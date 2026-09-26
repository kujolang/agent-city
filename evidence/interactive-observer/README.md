# Interactive Observer proof — 2026-09-26

`npm run proof:interaction` passed using a synthetic question-producing model, actual
Dispatch/Kujo SDK execution, and retained real Phase 1 telemetry for replay.
This fixture does not claim live-model product proof. That is recorded separately in
`../live-checkin/proof.json`.

Verified in Chromium: actual waiting question, authenticated reply supplied to the same
model context, reviewer handoff after reply, no premature handoff, immutable user reply,
unauthorized reply rejected, replay follows city → MCP portal, replay invokes no provider,
replay pause/restart, WebM download, no browser exceptions. Unit checks also cover atomic
single-answer behavior, wrong/expired checkpoint rejection, bounded replies, malformed
checkpoint handling, and deterministic replay of every retained event.

Artifacts: `question.png`, `replay.png`, `replay.webm`, `proof.json`.
The recorded clip is canvas-only; it is not a recording of the private chat panel.
`npm run proof:mission-contract` passed existing source-crash recovery, metadata redaction,
continuation, RAG/MCP, provider failure, and auth contracts (see `../missions/contract.json`).

During development the new question loop initially repeated a malformed provider response;
the existing contract caught it (5 requests instead of 3). Fixed to retry only after an
actual answered question; rerun passed. No provider-failure retry behavior was added.
A first live browser harness also selected a job via an ambiguous status poll; it was
changed to obtain the exact accepted mission ID from the POST response and poll its
terminal state explicitly. The completed source attempt was retained.

Limits: selected source run only (separate reviewer runs replay separately); long observed
gaps collapse to two seconds; redacted replay excludes private conversation; no reverse
scrubbing or automatic full-session video capture. Existing global release gates have
not been reclassified by this feature work. No long soak was run.
