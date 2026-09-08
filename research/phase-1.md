# Phase 1 implementation handoff

This file is the actionable build contract. Read [protocol.md](protocol.md) before touching the renderer and use [evidence.md](evidence.md) for exact existing source entry points. All tasks here are proposed implementation work; no application was implemented during research.

## Objective and invariants

Deliver a local, read-only Observer Mode that renders three to five explicitly identified Kujo execution instances in one original NES-style neighborhood, with meaningful travel, side-view interiors, agent/building inspection, Follow Mode and source-health visibility.

Every significant motion must have a real operation or explicit relationship evidence reference. All agent work proceeds independently of animation. Current task status updates immediately. Missing identity/coverage is shown as unknown, not inferred. No backend business behavior is authored in the renderer. Do not add Director commands, runtime orchestration, multiplayer, generated art or public deployment.

## Implementation order and file ownership

### Gate 0: verify baseline and pin dependencies

- Inventory current revisions versus `repository-inventory.json`. The research used post-release source; require the listed source commits or successors containing the inspected telemetry, not just matching README versions.
- Preserve unrelated files; Agents SDK already had untracked maintenance-agent work at research time.
- Initialize npm workspaces, strict TypeScript and exact direct dependencies: evaluated Pixi 8.20.0, supported Vite/Vitest/Playwright, SQLite driver with a proven Node startup. Node 24 is the local baseline. Lock exact resolved versions; record browser/editor versions in the build receipt.
- Implement `packages/protocol` JSON Schemas plus generated types and explicit per-event payload validation. The TypeScript sketch in the report is not sufficient validation.
- Confirm current Watchdog-native validation and identity conflict tests. Add fixture for separately identified instantaneous lifecycle start/finish, retry with identical serialized canonical batch and source occurrence time retention.
- Establish producer-instance identity, scoped workspace mapping and fixed demo profile bindings. Use `kujo-agents` manifest IDs where appropriate; three to five active instances may reuse roles but never IDs.

**Exit evidence:** no ambiguous event identity, start/end mutation rejected, empty/partial fields cannot produce live work. A static Pixi canvas spike may verify exact scaling and dependency budget in parallel; no larger scene work before lifecycle gate.

### Gate 1: emit real lifecycle observations

Primary files to change in the owning repositories, in small separate commits:

| Owner | Addition | Reuse rather than replace |
|---|---|---|
| Agents SDK `src/agents/runner.kujo` and events/tracing modules | Optional metadata-only observer sink; actual run/tool/retrieval start/finish/failure calls | Existing run IDs, policies, tool registry, retrieval adapter, metadata.events |
| Dispatch `src/core/hooks.kujo`, `runner.kujo` | Prefer existing live JSONL sink; add explicit actor/attempt/source occurrence correlation where missing | Existing hooks, state, retries and durable webhook outbox |
| City `integrations/kujo` | Local spool bridge and allowlisted observation profile using native Watchdog module | Existing canonical normalization/hash/privacy rules |
| Watchdog feed metadata | Store epoch/retention coverage extension and restore tests | Existing `/telemetry/v2/jsonl`, signed cursor, checksums and canonical persistence |

Optional observer callbacks must be metadata-only, bounded and exception-isolated. No network request in the runner callback. Existing Dispatch file hook is synchronous; measure bounded local append overhead and move network work to bridge. Define spool capacity/overflow counters; on overflow work continues and observation coverage becomes partial. Spool retention is not allowed to fill the host disk silently. Do not drop business receipts or change source retry/approval semantics to serve the visualizer.

Prove actual live ordering using a test transport that starts a real tool/retrieval then waits on a test-controlled completion barrier. Observe the start through Watchdog and the gateway before releasing the barrier. This validates timing without sleeping a live production tool for animation. Also run the actual local RAG fast path without the barrier; completed queries must display as recent if travel lags.

Model test path: adapt `agents-sdk/examples/rag_documentation_agent.kujo`: deterministic offline model callback, actual local Kujo RAG HTTP query. Dispatch example `examples/workflows/documentation-query.json` supplies the configured documentation tool/workflow pattern. For full Agent→Task→Run proof, add an ordinary Dispatch agent step invoking the SDK example through existing registered execution interfaces; retain explicit task/run/agent mapping. Do not claim the existing documentation-query tool step is itself a running SDK agent. Source fixtures provide three-to-five executions with distinct IDs, not decorative fake citizens.

**Exit evidence:** real Dispatch task and SDK run, actual RAG start/end, canonical records accepted, first start seen before controlled completion, no query content in observation journal, source work succeeds with gateway stopped. If this gate fails, stop visual expansion and fix the seam.

### Gate 2: gateway and pure core

- Implement `apps/gateway`: one Watchdog cursor reader, checksum/schema validation, scoped normalization, SQLite derived journal and transactionally consistent snapshot, SSE/history and evidence resolver.
- Implement source epoch/retention handling and explicit reset recovery. Invalid cursor or missing retention continuity is visible; never restart at zero and quietly double-count.
- Implement `packages/world-core`: independent truth reducer, activity windows, deterministic route graph and fixed 20 Hz presentation. No imports from Pixi, browser globals, server IO, source repos or wall clock.
- Use operation/attempt identity and outcome transitions in protocol.md. Store source causal relationships separately from Relay predecessor-chain links.
- Implement gap/reconciliation behavior before routine successful playback. Owner state snapshot can correct unknown current state, not invent missing history.
- Add replay-by-fixture and sorted semantic state hash now. Replay UI can wait.

**Exit evidence:** protocol adversarial fixtures, disconnect-before/after-commit recovery, no duplicate counts or terminal regression, 15 retrievals become one bounded visit, concurrent operations do not duplicate personas, event stream remains useful with no renderer mounted.

### Gate 3: authored world and Pixi views

- Build finite 512×384 overworld using 16×16 navigation cells; screen 256×240, world area 256×208 and 32-pixel HUD. Keep the five-facade block in report section I.
- Build Tiled compiler with unique semantic IDs, reciprocal portals, station reachability, external tileset bounds, supported flip flags and deterministic graph/hash output.
- Build Workshop and Library interiors first. Each fits 256×208; Workshop has workbench/evidence station, Library has docs and repository shelves, ladder and query terminal.
- Then build HQ task board, Meeting Hall handoff slots and Dojo three check stations from reusable templates. No fake meetings or combat.
- Use original geometric placeholder characters if the approved artwork isn't ready. Minimum identity manifest has distinct silhouette/accessory/glyph; placeholders are labeled. Never extract pixels from supplied images.
- Implement scene containers, shared appearance lookup, graph controllers, portal transition and on-demand room caching. Renderer reads core; click hit tests yield semantic IDs only.

**Exit evidence:** two actual source-backed activities cause overworld→side-view transitions, one instance ID persists across views, no unreachable station or extra business state in scenes, missing texture/context loss leaves DOM truth intact.

### Gate 4: observer, inspect, follow and real failure

- Observer starts city-wide, no unsolicited camera cuts. Agent/building roster is keyboard accessible. DOM detail includes current truth, recent visual activity, task/run/source refs, Workcell when present, evidence, freshness and explicit unknowns.
- Follow an instance through portals; ending it retains its outcome and never silently selects another worker sharing the name.
- Add one real SDK handoff between configured agents. Label handoff evidence; only display co-located consultation if actual session semantics support it. Message-sending UI remains absent.
- Run a real Eval fixture with a failed result, then repaired/passing result using existing Eval. Add invocation-bound start wrapper; preserve result projector and check IDs. Three Dojo stations show actual checks, skipped/failed/pass distinctly.
- Workcell evidence integration can be one explicitly bound invocation if available; Docker/Podman host capability is not required to fake an execution. If unavailable, Workshop remains SDK workspace and reports Workcell unknown/unavailable. Shipyard remains deferred.

**Exit evidence:** click Library and see the actual observed operations, click agent and trace it to source, follow a real handoff, show failure→subsequent pass without erasing failure. No generated conversation, percent progress or publication inferred from a gate.

### Gate 5: release verification and handoff

- Unit/property tests: reducer idempotence, terminal monotonicity per attempt, unknown identity, version reject, redaction, deterministic hashes, stable path tie breaks, windows and interruption.
- Contract tests: source-native canonical mappings, real live hook order, source namespace collisions, exact-retry versus conflicting IDs, correlation and canonical occurrence time.
- Integration: actual RAG/SDK/Dispatch proof through Watchdog, read projection and browser; one real handoff; Eval failure/pass; no tool execution during replay; stopped gateway does not stop agent.
- Browser evidence: screenshots of overworld, each required interior, selected inspector, stale/gap state and Follow transition; keyboard/320px/mobile layout, DPR 1/1.25/2, reduced motion and GPU-loss fallback. Use Lens/Playwright once, not redundant overlapping suites.
- Stress: 1,000 events/s for 60 seconds with bounded journal pages/client queues, distinct semantic counts and zero silent critical loss; 5/25/100/500 instance profiles with 500 aggregated. Record hardware/browser/build/corpus and actual measurements.
- Soak: eight hours of replay/live-like input, heap/texture/queue samples after warm-up, hidden-tab resume, slow client reconnect, stable source freshness. Report incomplete soak honestly; source apps' soak claims do not transfer to City.
- Gate thresholds: report budget deltas for compressed JS/assets, texture memory, p95 frame time and input-to-inspector latency. Inspector receipt-to-visible target ≤250 ms excluding upstream collection latency; end-to-end includes source+bridge+feed polling and must be reported separately.
- Spec/Eval/Fence/ShipCheck orchestrate appropriate checks; RunLedger records the run and links evidence. CaseFile only on failure. Commit source-repo lifecycle changes independently, then city contracts/core, then renderer/UI and evidence. Push only scoped changes and verify clean trees for touched work.

**MVP complete only when all required gates pass**. Phase 0 metadata feed hardening is a predecessor, not an excuse for an incomplete live claim. Demo artifacts distinguish actual runtime proof, offline model execution and synthetic stress traffic. If release criteria cannot be met, deliver an explicitly scoped prototype with failing gates listed instead of declaring Observer MVP complete.

## What the implementation agent must not rediscover

- Watchdog already has a signed-cursor canonical JSONL export and native adapter. Do not build a generic broker or use offset-based dashboard exports.
- RunLedger has correlation links, not enough detail for full replay. Relay's ordered evidence is useful but predecessor links are not causality; SDK events may be post-run and Dispatch traces are capped.
- SDK tool event enum does not prove actual emission. SDK role is chat role. Default IDs/timestamps need explicit scope/precision.
- RAG's configured OTLP endpoint is included in an audit record by the inspected `trace_emit`; it is not proof of HTTP OTLP delivery.
- Pixi WebGL is the selected foundation. Phaser 4 exists and is viable; Three and automatic Pixi Canvas fallback are not part of this design.
- Source and current-state references in evidence.md are frozen at research time. Revalidate changed APIs only; do not repeat the entire renderer/product research.
