# Agent City hardening candidate — 2026-09-08

**Archived baseline report.** The failures and measurements below describe the
September 8 candidate, not the current release status. See the
[current checklist](RELEASE-CHECKLIST.md) and [bounded gate assessment](RELEASE-BLOCKERS.md)
for subsequent fixes and qualification. The user cancelled the eight-hour soak;
none is running or scheduled, and it must not be restarted without a new request.

## HISTORICAL RELEASE STATUS: FAIL

The local Observer remains functional. This candidate is **not release-qualified**. The mandatory 1,000 events/second gate failed, end-to-end transport stress is unverified, Watchdog store replacement continuity is incomplete, and the eight-hour soak was not completed. `npm run gate` and the Kujo Eval release suite deliberately fail for these reasons.

## WORKING FEATURES

- Existing six-room read-only Observer, source-qualified execution selection, Follow, evidence-linked travel, current truth independent of animation, failure/pass attempt history.
- Durable SQLite normalized journal, immutable identity checks, transaction rollback, cursor persistence, checksummed checkpoints every 1,000 events and tail recovery. Old journal rows are no longer deleted by the gateway. Default quota is 1,000,000 events; ingestion stops explicitly at quota and retains evidence. This is a record-count bound, not a disk-byte guarantee.
- Archive: latest 200 source runs, explicit run selection, comparison summaries, normalized timeline, operation attempts, artifact references, local RunLedger receipt correlation metadata and pinned replay. Raw artifact files are not opened. RunLedger receipts are not used as lifecycle authority.
- Watchdog incident panel: observed failures, source gaps/recovery and explicit approval metadata. Unconnected alerts/policy sources remain UNKNOWN; no invented incident geography.
- More than 25 presentation instances aggregate; selected/followed instances remain detailed. Only the current scene draws, routes remain destination-driven, labels are bounded. Hidden rendering pauses, and returning to visibility reconstructs a snapshot without inventing missed travel.
- DOM-only presentation at `?renderer=off`; DOM truth survives rendering failure and WebGL context loss.

## LIVE SOURCES

Existing instrumented owners remain SDK run/tool/retrieval/handoff, Dispatch task/workflow/retry, explicit local MCP invocation, Eval invocation/check outcomes, and Workcell host/preflight. No source repository changed in this task. Prior real five-instance, 47-event proof: [Phase 1 report](RELEASE-PHASE-1.md).

New outage proof: producer `hardening-outage-1788864620179`, Dispatch/SDK run `run-1788864620414-1343`, actor `hardening-worker`, attempt 1. The actual local RAG query and SDK execution completed with the new test gateway stopped; process exit 0 and a 3,706-byte bounded lifecycle spool were recorded. The final Dispatch workflow observation is UNKNOWN and is preserved as such. This test does **not** claim subsequent Watchdog ingestion of that outage spool. See [recovery evidence](evidence/hardening/recovery.json).

Workcell's previous real proof remains a failed host preflight, not a successful container execution. Offline model callbacks remain explicitly identified; no paid model invocation is claimed.

## REPLAY STATUS

[47-event pinned bundle](evidence/hardening/replay.json) and [replay result](evidence/hardening/replay-result.json). Repeated real-corpus replay produces semantic hash:

`a03059a108c9d041ecec0a99a64c43f0b6be3d3383dc4c2d9048aa7649de6c58`

Bundles preserve original normalized events, source/run/operation/attempt identity, occurrence time, observed order, evidence hashes, explicit related-agent references, protocol/adapter/core versions, core source hash, map version/hash, source profile bindings, completeness, snapshot and bundle checksum. Unknown causality remains absent. Run subsets explicitly exclude source-health observations outside their selection. Previously pruned journals cannot recover deleted evidence and are marked partial.

`npm run replay -- evidence/hardening/replay.json` validates checksum, schemas, pinned implementation/map/adapter and semantic snapshot. The browser verifies checksum, semantic version/snapshot and map/adapter compatibility. Browser compatibility relies on the declared core version; the CLI additionally rejects a changed core source hash. Replay never invokes model, MCP, Workcell, publication or source mutation. Selecting Replay disconnects live SSE; returning Live explicitly reconnects. Presentation starts from bounded planned activities; this is a semantic replay foundation, not a time-scrubbing debugger or pixel-identical recording.

## PERFORMANCE / SCALE

Measured on macOS 26.6.2 x86_64, Node 24.20.0, Chromium 151.0.7922.34. [Build/asset measurements](evidence/hardening/performance.json), [scale and soak](evidence/hardening/scale-soak.json), [browser results](evidence/hardening/browser.json).

- All emitted JS: 194,995 gzip bytes; all emitted non-JS assets: 2,061 gzip bytes at measurement. This is the emitted bundle inventory, not a network-waterfall assertion about initial transfers.
- Original artwork uses procedural Graphics: zero decoded raster-artwork bytes. Driver textures/framebuffers and total GPU allocation remain unmeasured.
- Stationary synthetic 5/25/100/500 profiles: p50 frame interval ~16.7 ms, p95 16.7–16.8 ms; synchronous inspector update 6.5/8.3/8.7/12.0 ms. These are snapshot profiles, not 500 concurrently active routes.
- Final isolated browser verification: p95 frame intervals 16.8/16.8/16.8 ms at DPR 1/1.25/2. An earlier concurrent-stress browser run measured 16.8/33.3/33.2 ms; both workload contexts matter.
- Browser inspector timings measure synchronous DOM changes, not paint. Upstream-to-visible latency was not remeasured for this candidate. Queue samples in the stationary scale profiles were zero; this does not prove burst backlog behavior.

## STRESS RESULTS

**FAIL.** Production Journal API processed 60,000 normalized synthetic completed retrieval events across 25 instances in **85.887 seconds: 698.595 events/second**. All 60,000 were retained; missing count 0. SQLite file 66,752,512 bytes. Batch size 100: p50 102.12 ms, p95 355.12 ms. CPU 92.751 seconds. Heap samples grew from 16.19 MB to 89.92 MB; RSS from 109.21 MB to 426.30 MB. These include projection warm-up and GC variation, not a proven leak diagnosis.

[Final stress](evidence/hardening/stress.json), [pre-checkpoint failure](evidence/hardening/stress-before-checkpoints.json), [checkpoint iteration](evidence/hardening/stress-checkpoint-iteration.json). An initial unfinished-only workload was interrupted; it is not represented as a completed benchmark. Completed-operation measurements do not cover unbounded active-operation accumulation.

This is a direct production journal test, **not** Watchdog HTTP → gateway → SSE → browser throughput. End-to-end reconnect, slow-client backpressure and critical-event delivery at 1,000/s remain unqualified. Adaptive polling now drains full Watchdog pages without the previous fixed 250 ms catch-up delay. Its end-to-end capacity is unmeasured.

## SOAK RESULTS

**INCOMPLETE: 180.168 seconds, 18 samples.** Historical real journal with live source-health polling, stationary presentation and no new producer traffic. DOM remained usable after CDP frozen/active resume. This is not an eight-hour live-like ingestion soak, and CDP freeze is not proof of browser visibility transitions. Heap, document/node and task-duration samples are preserved; texture allocation and eight-hour journal growth are unavailable. No long-running stability claim is made.

## BROWSER / ACCESSIBILITY

Passed Chromium DPR 1/1.25/2; 320px viewport without document overflow; keyboard roster selection; reduced-motion pause; isolated replay; explicit DOM-only fallback; `WEBGL_lose_context` loss/restore with DOM usable and renderer ready afterward. Zero page errors in the final browser suite. CDP pageScaleFactor 1.25 tested; browser chrome zoom and a screen-reader audit were not performed. Hardware initialization exhaustion was not simulated; DOM-only mode deliberately throws before renderer initialization. Pixi may itself fall back when hardware WebGL is disabled.

Screenshots: [DPR 1 replay](evidence/hardening/replay-dpr-1.png), [320px replay](evidence/hardening/replay-dpr-2.png), [DOM fallback](evidence/hardening/renderer-fallback.png), [500-instance aggregation](evidence/hardening/scale-500.png).

## SECURITY / PRIVACY

Reviewed gateway normalization, protocol, journal, SSE, evidence, replay and RunLedger receipt paths. Events use a strict schema and bounded identifier metadata; unsupported metadata is quarantined rather than sent to the browser. City does not persist raw prompt, chat, query text, RAG chunks, tool arguments/results or model output as journal fields. Canonical evidence is a reference/hash, not raw content. Metadata strings reject whitespace, URL/query and filesystem-path syntax; identifiers still depend on producer discipline.

Watchdog bearer credentials remain server-side in environment/private runtime token storage. Scope is fixed to `local-agent-city`; unknown workspace binding for a City producer becomes an explicit gap/quarantine reference. Unrelated producers are ignored. All HTTP handlers are read-only and loopback-bound; foreign Origin and nonlocal Host are rejected. Evidence resolves only local journal event IDs, never arbitrary paths or URLs. Receipt reading uses a configured local directory, realpath checks, size/count bounds and a field allowlist excluding prompts, notes, output and private paths.

Authorization is local host/origin plus configured workspace, not multi-user authentication. No public or multi-tenant security claim. Workspace migration, byte quotas and authenticated raw artifact resolution remain outside this candidate.

## FAILURE RECOVERY / DEVELOPMENT GATES

Passing evidence: exact duplicate retry; conflicting identity rollback; malformed event rejection; quota rollback; durable cursor/restart; checkpoint corruption rejection; immutable prior truth; deterministic replay; stale cursor explicit SSE reset; foreign origin 403; mutation 405; malformed evidence 400; missing evidence 404; actual source success during gateway outage; context loss/DOM fallback.

- `npm run verify`: 23 tests, strict TypeScript, pure core boundary, map compilation and production build pass. [Log](evidence/hardening/verify.log).
- Fence: no violations. [Report](evidence/hardening/fence.json).
- ShipCheck `gate --dir . --format json`: exit 0, zero failed errors, six warnings. Warnings are repository metadata/convention checks; this is not release certification. [Report](evidence/hardening/shipcheck.json).
- Eval measured gate: correctly fails mandatory release criteria. [Report](evidence/hardening/eval/eval-report.md).
- Spec contract is saved, but the installed validator did not run successfully: wrapper returned `Validation output parse error`; direct runtime returned `Unknown method: add_argument`. No Spec validation pass is claimed.
- CaseFile failed-throughput capture: `2026-09-08-064759-citystressbelowtarget` (local `.casefile/`); its measured first failure is retained.
- RunLedger attempt: `2026-09-08-codex-agent-city-replay-and-release-hardening-001`.

Not proven: signed Watchdog store replacement/retention epoch recovery; stale owner snapshots versus transport freshness; sustained slow-browser/SSE overflow delivery; hidden-tab event bursts; eight-hour stability. A visible sequence discontinuity now conservatively marks partial coverage, but it cannot replace a producer store-epoch contract.

## REMAINING RISKS — RANKED

1. **Release blocker:** measured ingestion below 1,000/s; full transport and burst/slow-client test absent. Profile journal reduction/checkpoint cost before claiming throughput.
2. **Release blocker:** Watchdog signed cursor lacks store-epoch/retention continuity evidence. A replaced store can make transport availability look healthy while historical continuity is unknown.
3. **Release blocker:** only a three-minute stationary soak; active operation growth, memory/GPU behavior and eight-hour reconnect behavior are unqualified.
4. **High:** static scale profiles do not qualify 500 moving/concurrent instances. Archive browsing is bounded to 200 runs; large replay export is capped at 100,000 journal events, offline file input at 32 MiB. No paginated whole-history archive UI yet.
5. **Medium:** upstream-visible paint latency, browser chrome zoom, screen-reader behavior, production packaging/launcher and full GPU accounting remain unverified. The application still uses the local development launcher.

## RECOMMENDED NEXT PHASE

The original recommendation was further Phase 1 hardening. Subsequent full-path
ingestion/reconnect and store-continuity evidence supersede the blockers listed
here. The proposed eight-hour soak was cancelled by the user. Use the current
release checklist for remaining work; this historical report does not authorize
a soak, Phase 2 expansion or Director Mode.

## SOURCE / CHANGE BREAKDOWN

Only `kujolang/agent-city` changed: gateway journal/archive/receipts/privacy/recovery; pure core replay and copy-on-write reduction; renderer aggregation and manual scheduling; DOM archive/incidents/replay/fallback; bounded performance/recovery/browser scripts; tests, Fence/Spec/Eval contracts, candidate metadata and evidence. Sibling lifecycle repositories and unrelated maintenance work are preserved.
