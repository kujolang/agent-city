# Research verification

September 7, 2026. This verifies the research pack and selected existing integration behavior. It does **not** certify an unbuilt application.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| Watchdog `node tests/telemetry_native_adapter_check.js` | PASS | Existing native lifecycle conversion and privacy/correlation fixture |
| Watchdog `node tests/telemetry_v2_identity_conflict_suite.js` | PASS | Existing immutable ID conflict rejection; temporary local test server/database cleaned by suite |
| AI Chat `node --test tests/execution-replay.test.js` | PASS, 4 tests | Cursor replay/dedup, cancellation, terminal attempt, UTF-8 event parsing |
| Pack JSON/source integrity | See `verification-results.json` | Inventory/source-index parse, 83 source files and hashes, relative Markdown links, required A–P sections and final recommendations |

Source inspection confirmed SDK missing emitted tool lifecycle, Dispatch's no-trailing-newline hook framing, Relay predecessor-chain semantics, Watchdog cursor/native mapping, RAG trace-to-audit behavior and RunLedger receipt fields. These are source observations, not newly authored failing tests. No broad ecosystem suite was run, and no source repositories were changed.

## Deliverable coverage

| Required deliverable | Location |
|---|---|
| A Executive summary | report-source.md §A |
| B Capability map | report-source.md §B; evidence.md source ledger |
| C Actual runtime model | report-source.md §C; evidence.md runtime/historical details |
| D Architecture + diagrams | report-source.md §D; protocol.md |
| E Renderer decision matrix | report-source.md §E |
| F World model / TypeScript | report-source.md §F |
| G Event model | report-source.md §G; protocol.md |
| H Event-to-world table | report-source.md §H |
| I City blueprint | report-source.md §I |
| J Scene/camera/navigation model | report-source.md §J |
| K Sprite/asset pipeline | report-source.md §K |
| L MVP | report-source.md §L; phase-1.md |
| M Roadmap | report-source.md §M |
| N Repo/package architecture | report-source.md §N |
| O Risks/performance | report-source.md §O |
| P Decisions | report-source.md §P |
| Follow/replay/Director/Player | report-source.md final interaction section; protocol.md |
| BUILD THIS / DO NOT BUILD YET | report-source.md final two sections |

## Limits and outstanding implementation work

No artwork generation/editing, full application implementation, renderer prototype, measured bundle/FPS, live-provider run, browser application QA or eight-hour City soak occurred. Markdown/JSON is the requested coding-agent research pack; no PDF/Word export or rendered-page QA is claimed. Diagrams use Mermaid source and were structurally checked as fenced content; no rendered Mermaid layout verification is claimed.

The research task is complete. Live SDK lifecycle instrumentation, feed lineage/retention handling, correlation and the unbuilt Phase 1 acceptance suite remain explicit **implementation prerequisites**, not secretly completed work. Approved original assets and later deployment roster/policy are product inputs; placeholders permit local Phase 1 work.

## SignalBox admission and verification

- Stored Capture: `cap_749672ca-d521-4472-a01a-90c0eae3219a`, SDK live tool lifecycle coverage gap, project `agents-sdk`.
- Stored Signal: `sig_6c719a90-d5c6-4e80-b564-ff796c7989e0`, “SDK live tool lifecycle coverage is missing.”
- Exact ID retrieval: both returned successfully. Concept search `lifecycle`: both confirmed present.
- Duplicates: none found for exact tool event / live lifecycle queries. No other captures created.
- Rejected for capture: completed research summary, routine passing tests, renderer decisions, planned downstream city tasks and implementation recaps. Those belong in the pack/Strata handoff.

## Strata consolidation and publication

One handoff/state/timeline note saved in `Agent Notes`: `8857f534-11d0-4c94-9f61-3190317d5cf2`, “Session Memory · Agent City · architecture handoff · 2026-09-07.” [Saved content](session-handoff.md) preserves the architecture recommendation, source-evidence caveats, exact starting point, verification boundary and SignalBox references. No separate duplicate atomic notes, hub or timeline copies were created. Initial dedup searches returned no equivalent Agent City note; no supersession was needed.

Exact note retrieval passed. The first long concept query returned no result; focused tags were improved through the supported CLI, then concept query `spatial debugging` returned the saved note. Saved: 1; duplicate saves: 0; superseded/contested: 0; failed/pending writes: 0. This is the first saved project state: research complete, implementation unstarted.

The private `kujolang/agent-city` repository was created for this research pack; architecture and protocol commits were successfully pushed. The closing handoff commit records this receipt. No existing runtime repository was modified and no public site was deployed.
