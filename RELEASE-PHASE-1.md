# Agent City — Phase 1 Observer expansion

Local release candidate, September 8, 2026. Read-only Observer Mode is ready for
review. The existing Watchdog → gateway → pure world → Pixi architecture remains
intact. No Director/Player controls or public deployment were added.

## Build status

All six locations have semantic IDs, authored entrances, reciprocal portals,
interior navigation graphs, station slots, building inspection and observed
source-health state: Dispatch HQ, Workshop/Workcell, Library, MCP Terminal,
Meeting/Handoff and Evaluation Dojo. Unobserved stations explicitly show
**NO LIVE SOURCE**. Authored maps do not declare a runtime connection.

The world uses a 256×240 logical canvas, 16-pixel navigation cells, integer
nearest-neighbor scaling and cached scene geometry. Original procedural
appearance profiles have instance badges, role accessories, overworld/side-view
frame sets and explicit fallbacks for all 14 requested animation names. Dormant
speech, carry, ladder, completion and offline poses are not selected without
supporting observations. The supplied reference image pack was absent from the
available attachments/files; this is original placeholder art following the
written navy/blue NES command-center direction, pending reference-pack review.

Follow stays attached to one source-qualified execution across doors. UNKNOWN
intake cannot end Follow; terminal truth plus a settled presentation queue can.
The default view stays at the city. DOM controls cover the roster and filters,
agent/building/operation inspection, task/run state, timeline, failures, source
freshness, evidence and keyboard-operated presentation pause. Reduced motion
pauses presentation while truth continues to update.

## Real proof

Local proof label: `phase1-release-1788849720` (a local label, not a platform ID).
The retained cohort contains exactly **five real execution instances**:

| Source operation | Exact identity | Observed result |
| --- | --- | --- |
| Dispatch invokes SDK; SDK calls Kujo MCP `read_project_docs` | `run-1788849303229-8516`, actor `mcp-worker` | SDK completed; Dispatch task/workflow completed; MCP server `mcp-demo`, invocation suffix `:mcp-docs`, attempt 1, result returned |
| Dispatch/SDK source performs local RAG and hands off | `run-1788849313240-2574`, actor `scout` | Completed; actual retrieval and paired handoff evidence |
| SDK child performs retrieval | `run-1788849313240-2574-handoff-docs-target`, actor `docs-target` | Completed; explicit related execution identity; profile remains UNKNOWN where the source did not supply one |
| Eval invocation checks a real file, then corrects it and reruns | `eval-1788849319462`, actor `verifier` | Attempt 1: schema/policy pass, content fails, one check skipped. Attempt 2: three pass, one skipped. Original failure remains |
| Workcell invocation attempts real local preparation | `workcell-invocation-1788849323908`, actor `workcell-host`; receipt `wc-7f8cba2b6162427b811dc42933598eb2` | Preparing failed, exit 4: rootful Docker lacks AppArmor. Container workload did **not** execute; cleanup complete |

The SDK model callback is deterministic/offline. Runtime execution, local RAG
HTTP retrieval, MCP HTTP tool execution and Eval checks are real. No paid model
reasoning, generated dialogue or synthetic primary product proof is claimed.
Workcell's rejection is shown as a real failed invocation/preflight, never as a
successful container execution. Its receipt and three-file manifest passed
`workcell verify`.

An additional real invalid-tool call (`does_not_exist`) outside the displayed
cohort produced a paired MCP failure with `resultCode: mcp-error`; its
metadata-only source log is retained. The source example also keeps artifact
failure independent from an already successful MCP call.

## Event flow and truth boundaries

```text
real Dispatch step / SDK run + RAG / MCP handler / Eval / Workcell invocation
  → bounded metadata-only local spool
  → existing Watchdog native normalization and canonical intake/export
  → scoped, validated gateway SQLite journal and SSE
  → immediate semantic truth reducer
  → deterministic A* / fixed ticks / bounded activity windows
  → authored station and portal projection in Pixi
```

MCP observations carry actual server, tool, invocation, attempt and result
classification. The inspector displays completed truth while travel/station
activity is RECENT. Fifteen retrievals in four seconds still compress into one
visit; outcomes, attempts and evidence remain distinct. Completed operation keys
cannot trigger another trip when a late terminal observation arrives.

Dispatch intake/assignment and workflow state come from its own handler/state,
not an inferred SDK outcome. An optional exception-isolated attempt callback
supports actual retry-start metadata; attempt identity reaches SDK child
execution. Paused/skipped/policy-denied Dispatch observations retain their own
states. Handoffs use evidence-linked context packets at current stations, not
fictional co-located meetings or invented conversation.

Retrieval collection/profile classification is now explicit source metadata;
missing classification remains UNKNOWN. Source occurrence time, gateway order
and presentation ticks remain distinct. A fresh transport does not erase an
existing coverage gap. The final 47-event review cohort has LIVE transport and no recorded gap;
reconnect gaps remain visible when present.

## Source changes

- **agents-sdk `bb2202d`**: `src/agents/runner.kujo`,
  `src/agents/tracing/lifecycle.kujo`, both Agent City examples,
  `tests/lifecycle_observer_tests.kujo`, `docs/WATCHDOG_TELEMETRY.md`.
  Explicit profile/collection/child identity and attempts; real MCP tool handler.
- **dispatch `dcffd8f`**: runner retry-observation seam, agent handler
  attempt context, Agent City example and attempt-observer contract test.
- **watchdog, mcp, rag, eval, workcell**: no source changes in this expansion.
  Their existing native/HTTP/CLI contracts are reused.

The unrelated SDK maintenance draft remains untouched and uncommitted.

## Agent City changes

- `658869a`: semantic metadata/schema/types, canonical normalization and bounded
  MCP/task/artifact/Workcell/Eval integration.
- `901ad70`: six-room maps, A*, stable ordering, slots, pure reducer/planner,
  source health, asynchronous packets and deterministic replay tests.
- `ce434a9`: appearance manifest, cached Pixi rooms, large integer-scaled canvas,
  DOM inspectors, roster filters and keyboard controls.
- `e3fc9b7`: real browser proof, screenshots/video, retained 47-event corpus,
  Workcell receipt verification and reproducible scripts.

Protocol remains additive within semantic v1; the gateway is a read-only derived
projection. No rendering package owns runtime business state.

## Visual evidence

- [MCP: completed truth and RECENT station activity](evidence/phase1/02-mcp-recent.png)
- [MCP invocation metadata](evidence/phase1/03-mcp-evidence.png)
- [Real Library retrieval](evidence/phase1/04-library.png)
- [Handoff evidence without forced co-location](evidence/phase1/05-meeting-handoff.png)
- [Eval original failure](evidence/phase1/06-dojo-failure.png)
- [Eval repaired pass with failure retained](evidence/phase1/07-dojo-repaired.png)
- [Workcell failed preflight](evidence/phase1/08-workcell.png)
- [Dispatch actual task state](evidence/phase1/09-dispatch.png)
- [City and five-instance roster](evidence/phase1/10-city-cohort.png)
- [Reduced-motion mobile DOM view](evidence/phase1/11-reduced-mobile.png)
- [Recorded Observer expansion](evidence/phase1/observer-expansion.webm)

[Machine-readable proof](evidence/phase1/proof.json),
[retained snapshot](evidence/phase1/snapshot.json),
[Workcell integrity verification](evidence/phase1/workcell-verification.json).
Additional `room-*.png` images show each final inspectable interior.

## Test results

- `npm run verify`: **19 tests / 4 files pass**, strict TypeScript, pure package
  boundary check, seven-map validation and production Vite build pass.
- Real Chromium proof: five instances; MCP call/travel/metadata; Library and
  handoff; Dispatch completion; Eval failure then correction/pass with skipped
  outcomes; Workcell preflight; keyboard filters/pause and reduced motion pass.
- SDK lifecycle tests: **2/2 pass**; core runner, module/example smoke,
  integration adapters, core types, Ability and Watchdog contracts pass.
- Broad SDK offline harness: **39/41 groups pass**. The same pre-existing
  maintenance draft and warning-based fixture failures remain; prior baseline
  reproduction is documented in `BUILD-RESULT.md`. No unrelated fixtures were
  refreshed.
- Dispatch attempt observer: **2/2 pass**, including a real retry and observer
  exception isolation. SDK adapter and policy-precedence checks pass.
  With `DISPATCH_OFFLINE_FIXTURE=true`, the broad Dispatch suite passes **101/101**,
  and its SDK adapter suite passes **10/10**. The initial live-default run hit
  authentication-dependent failures; the required offline run is the release check.
- Actual MCP invalid-tool failure was preserved. Workcell failure evidence
  verifies; this is not a passing container workload gate.
- Pure replay of the retained 47-event expansion corpus reproduces the same
  truth/presentation state and retains both Eval attempts and source references.

## Known gaps and review boundary

- **Workcell execution unavailable on this host**: AppArmor preflight rejection.
  Retry on a compatible configured host; do not bypass the guardrail.
- **Visual pack unavailable**: original placeholders need review against the
  actual supplied/approved pack when it is made available.
- MCP approval-pending, explicit message content, SearchBridge/external research,
  broader artifact producers and all MCP server families are not demonstrated by
  this cohort. Their absent station sources remain explicitly unavailable;
  metadata/schema support is not presented as live coverage.
- The existing local retained-journal profile still lacks production Watchdog
  lineage/retention recovery, extended soak/stress and GPU-loss gates. Those are
  unchanged later gates, not expanded production claims.
- Complete replay UI, public deployment, Director Mode and Player Mode remain
  outside this read-only release.

## Next step

Review this Observer release and the actual visual pack. The next acceptance
probe is the existing Workcell adapter on an AppArmor-capable/rootless-compatible
host, retaining its verified execution/artifact receipt. Keep source-lineage and
retention hardening as a prerequisite for unattended operation.

## Durable handoff

See `evidence/phase1/memory-receipt.md` for Strata consolidation and retrieval.
SignalBox: no captures warranted. Completed fixes and proof results belong in
Strata; the known Workcell host restriction and deferred integration gates are
not new reusable bug/security findings.
