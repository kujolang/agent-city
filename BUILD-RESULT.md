# Agent City — Observer vertical slice build result

Completed locally September 7–8, 2026. This report separates the delivered
vertical slice from the broader production gates in the research contract.

## BUILD STATUS

**Phase 0A truth seam and Phase 0B world-feel proof passed. The Phase 1 Observer
vertical slice is implemented and ready for review.** A real execution travels
Workshop → city → Library, preserves its identity, and displays current truth
independently of animation. Five explicit runtime execution instances are in
the retained review cohort: four SDK executions and one Eval invocation.

The local app is http://127.0.0.1:5178. Follow, inspect, building selection,
evidence opening and animation pause are presentation-only. No runtime commands
are available in the web UI. The complete unattended/production Observer MVP is
**not** declared complete; deferred and incomplete gates are listed below.

## REAL PROOF

| Actual operation | Owner identity | Result |
| --- | --- | --- |
| Dispatch agent step `retrieve-docs` invokes SDK with actual local RAG | `run-1788838682177-9649` | Dispatch `ok:true`, SDK `completed`, retrieval `applied` |
| SDK source hands off to `docs-target`; both execute local retrieval | `run-1788838713723-6597`, child suffix `-handoff-docs-target` | Source and child completed; distinct paired handoff observations |
| Eval runs three actual file checks, repairs input, reruns | See `evidence/final-snapshot.json`, verifier execution | Attempt 1: 2 passed, 1 failed. Attempt 2: 3 passed, 0 failed. Failure retained |
| Dispatch/SDK/RAG while Agent City gateway is stopped | `run-1788838767571-5673` | Source exited 0 while gateway remained unavailable; restored projection has one execution and two operations |

RAG corpus: `rag/examples/kujo_docs`, four documents/four chunks, namespace
`agent-city`, local JSON index and hash embeddings. The query asks about Kujo
module imports. The model callback is explicitly deterministic offline; this
is real runtime/retrieval activity, not a paid LLM reasoning claim.

For the timing gate, a test proxy performs the actual RAG request and holds its
response behind an explicit completion barrier. The browser sees the active
operation before that barrier is released. Normal production calls are never
delayed for animation. The handoff and outage proofs use the normal fast path.
The handoff source's final retrieval metadata says `empty_context`; the proof
claims the actual calls and handoff outcomes, not answer/content quality.

Detailed receipts: [browser proof](evidence/browser-proof.json),
[handoff/Eval proof](evidence/expansion-proof.json),
[gateway outage proof](evidence/recovery-proof.json),
[bridge loss proof](evidence/bridge-health-proof.json).

## SOURCE CHANGES

All three source commits were pushed independently to their owning repositories.

| Repository / commit | Files and behavior |
| --- | --- |
| `agents-sdk` / `5cef522` | Runner; new `tracing/lifecycle.kujo`; observer example; lifecycle tests and fixture; Watchdog docs. Metadata-only live run, retrieval, tool and child-handoff envelopes; bounded local spool; exception isolation; explicit source-owned task binding and stable parent/child identity |
| `watchdog` / `6cbd121` | Native adapter and dashboard source/root mirrors; native and API tests. Preserve Kujo `int` values through both native normalization and canonical privacy intake, including attempts and occurrence milliseconds |
| `dispatch` / `505683d` | `examples/agent_city_observer.kujo`: ordinary plugin-registered agent handler calls the SDK example with explicit run/task context |

RAG and Eval source repositories were not modified. The untracked SDK
maintenance draft was preserved. Its two failing assertions reproduce in an
isolated worktree at the unchanged SDK baseline `e0be75b`; they are not included
in these commits.

## AGENT CITY CHANGES

- `packages/protocol`: strict JSON Schema, generated TypeScript union, payload
  checks, bounded evidence, version and operation/attempt identity.
- `packages/world-core`: pure truth reducer, monotonic terminal outcomes,
  retained retries/failures, deterministic path tie-breaks, fixed 20 Hz
  presentation, four-second coalescing and bounded visit queues.
- `packages/renderer-pixi`: PixiJS 8.20.0/WebGL projection, original pixel glyphs,
  worker silhouettes and stable instance badges, scenes and hit tests.
- `apps/gateway`: Watchdog signed-cursor reader, canonical/schema/checksum/
  manifest checks, source scoping, transactional derived SQLite journal,
  consistent snapshot, resumable SSE/history, bounded evidence resolver,
  persistent coverage gaps and independent bridge health.
- `apps/web`: readable DOM roster and inspector, current truth versus visual
  activity, Follow without identity switching, room selection and pause.
- `assets`: original finite orthogonal Tiled JSON maps and deterministic compiler.
  City, Workshop, Library, MCP Terminal and Dojo. All six required facades exist.
- `integrations/kujo`, `scripts`, `tests`: native normalizer reuse, immutable
  serialized batch retries, real-run harnesses, replay corpus and browser proof.

## EVENT FLOW

```text
Dispatch retrieve-docs agent handler
  → actual SDK run / local RAG query / child handoff
  → live metadata callback → bounded per-execution NDJSON spool
  → separate local bridge → Watchdog native normalizer
  → immutable canonical batch → Watchdog canonical store
  → signed-cursor JSONL feed + checksum/manifest validation
  → scoped SQLite journal + immediate semantic truth reducer
  → snapshot/resumable SSE → browser truth
  → pure visit planner → fixed ticks → Pixi city/Library/Dojo
```

Occurrence milliseconds, gateway observation/order and presentation ticks stay
separate. The gateway preserves terminal truth before publishing. A completed
operation can remain visually RECENT. Task refs are source supplied; task status,
runtime presence, Workcell and absent artifact/repo refs explicitly remain
UNKNOWN. Eval check starts are not fabricated from terminal-only results.

## VISUAL PROOF

- [City / overworld](evidence/01-city.png)
- [Observed start before controlled completion](evidence/02-start-before-completion.png)
- [Library with completed truth and RECENT retrieval](evidence/03-library-truth.png)
- [Workshop](evidence/04-workshop.png)
- [MCP Terminal: no live source](evidence/05-mcp.png)
- [Gateway stopped / stale observation](evidence/06-gateway-stale.png)
- [Dojo: failed check and subsequent pass retained](evidence/07-dojo-outcomes.png)
- [320-pixel mobile layout](evidence/08-mobile.png)
- [Actual transition video](evidence/vertical-slice.webm)

The supplied reference image pack was not present in the available repository
or task attachments. Original geometric placeholder artwork follows the written
visual direction; no protected game assets were extracted or copied. Maps were
authored as Tiled-compatible JSON; no GUI-authored Tiled export is claimed.

## TEST RESULTS

| First milestone gate | Result |
| --- | --- |
| Real Dispatch and SDK execution | PASS |
| Actual local RAG query | PASS |
| Start reaches browser before controlled completion | PASS |
| Gateway failure cannot stop source work | PASS |
| Workshop → city → Library travel | PASS |
| Instance identity survives scene transition | PASS |
| Inspector truth independent of animation | PASS |
| 15 retrievals compress into one visit | PASS, synthetic unit test only |
| Stale/gap visible honestly | PASS, gateway outage and bridge pause |
| Pure replay deterministic | PASS, synthetic tests and retained real trace |

`npm run verify`: strict TypeScript, architecture boundary check, map validation,
**11 tests in 3 files**, and production build pass. Map checks cover IDs,
reciprocal portals, tile/flip limits, supported floors and navigation corridor.
`npm audit`: zero reported vulnerabilities at verification time.

SDK lifecycle tests: 2/2 pass, including parent/child/task identity and bounded
spool failure isolation. Full SDK offline harness: 39/41 checks pass; remaining
failures are the unrelated maintenance draft and existing warning-based fixture
expectations (`maintenance_agent_tests`, `context_ledger_tests`). The relevant
runner, integration, Ability and Watchdog contracts pass. Fixture expectations
outside this change were not rewritten. Watchdog native, canonical API/privacy,
and immutable-identity conflict suites pass with Kujo 1.3.1.

Browser: Chromium 151.0.7922.34 on Intel i7-9750H, macOS Darwin 25.6.0, 16 GiB.
DPR 1/1.25/2 preserve the 256-pixel backing canvas; mobile 320px and reduced
motion pass. Measured rAF p95 is **16.70 ms** over 119 intervals; selection to
synchronous inspector DOM update is **0.40 ms**, not a paint-latency claim.
Observed upstream lag p95 in the mixed controlled/outage corpus is **3232 ms**;
it includes source, bridge, normalization and gateway delay. It is separate
from immediate inspector application. All emitted JavaScript chunks total **189497 gzip bytes** after a clean build;
the compiled map source is 18010 bytes. See [build receipt](evidence/build-receipt.json).

## KNOWN GAPS

- No Watchdog store-epoch/retention-generation extension. This is a retained,
  local review profile with conservative gaps on reconnect. Restore/retention
  continuity needs an explicit new projection/full retained export; lossless
  unattended recovery is not claimed.
- MCP live instrumentation and approvals are not connected. Its semantic
  stations exist and say NO LIVE SOURCE. Meeting has no fabricated consultation;
  real handoff evidence is inspectable, but no co-located meeting is inferred.
- Direct Dispatch task lifecycle projection, generalized artifacts/relationships,
  Workcell binding and broader profile manifests remain incomplete. The SDK
  run's outcome is not substituted for a Dispatch task-status observation.
- No 500-agent rendering gate, eight-hour soak, full 1000-events/s stress gate,
  complete replay UI, GPU-loss recovery, mobile perfection, public deployment,
  Director or Player Mode. These were deliberately deferred for this milestone.
- The provided local spool bounds bytes and isolates failure; arbitrary custom
  callbacks must obey its no-network contract. Local filesystem latency is not
  a hard real-time guarantee. Journal and bridge quotas are local safeguards,
  not a production retention/rotation policy.
- Original placeholder art awaits review against the full reference pack.
- SDK's unrelated pre-existing maintenance/fixture failures remain outside this
  task. Watchdog and Dispatch are clean; SDK's unrelated untracked work remains.

## NEXT BUILD STEP

After reviewing this slice, connect the MCP Terminal Center to actual MCP client
start/result/failure observations with explicit server, tool and call identity.
Prove one real call through the same Watchdog seam before adding visual activity.
Keep lineage/retention hardening as a required gate before unattended use.

## DURABLE HANDOFF

Strata storage and retrieval receipts are recorded in `evidence/memory-receipt.md`.
SignalBox: no captures warranted. Resolved lifecycle defects, completed build
summaries and planned downstream gates are not new SignalBox findings.
