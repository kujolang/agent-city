# Agent City protocol and correctness contract

Status: **PROPOSED v1**, September 7, 2026. This is a contract specification, not an implemented service. [Architecture](report-source.md), [source evidence](evidence.md), [build gates](phase-1.md).

## 1. Authority and boundaries

1. Producer owns operational state and side effects. Dispatch tasks do not become completed because Watchdog saw a successful model response.
2. Watchdog owns canonical observation records and their integrity. City consumes the existing canonical JSONL export, not the heuristic `/api` dashboard outcome summaries or raw database tables.
3. Gateway owns validation, explicit binding, scoped normalization and a rebuildable read projection. It can say unknown/stale/gapped but cannot repair a runtime by fabricating a successful event.
4. Browser truth reducer applies accepted observations immediately. Presentation derives evidence-linked visits and never drives producer work.
5. Renderer may dispose/recreate all GPU state without losing identity or truth.

Use Watchdog's native contract where possible. Timed completed spans and instantaneous lifecycle observations are different. Current `native_normalize_event` defaults absent end time to start time and canonical IDs are immutable; do **not** send an unfinished span then overwrite its ID with a finished span. Emit distinct instantaneous start/finish observations with shared operation ID, or a start observation plus separately identified completed span. The bridge makes lifecycle phase explicit and never infers `started` from canonical status `unset`.

## 2. Producer observation profile

The following is a **new producer convention within the existing native contract**. These attribute keys are proposed; the existing contract permits bounded scalar attributes. Constructors/adapters must test the profile through Watchdog validation. `agent`, `run`, `tool_call` and `task` references already have native representation. Workcell and profile references can use namespaced `external` references, not new unsupported top-level reference kinds.

```json
{
  "schema_version": "watchdog.native-event.v1",
  "event_id": "city-demo:session-01:query-01:start",
  "event_kind": "retrieval",
  "instantaneous": true,
  "trace_id": "city-demo:session-01:run-01",
  "name": "retrieval.started",
  "status": "unset",
  "started_at_ms": 1788796800000,
  "references": [
    {"type":"agent","namespace":"city-demo","id":"worker-01","relation":"actor"},
    {"type":"run","namespace":"city-demo","id":"run-01","relation":"groups"},
    {"type":"task","namespace":"city-demo","id":"task-01","relation":"groups"}
  ],
  "attributes": {
    "kujo.lifecycle.phase":"started",
    "kujo.operation.id":"query-01",
    "kujo.operation.attempt":1,
    "kujo.producer.instance":"session-01",
    "kujo.source.sequence":7,
    "kujo.source.occurred_at_ms":1788796800000,
    "kujo.capability":"rag.query",
    "kujo.collection.id":"kujo-docs",
    "kujo.lifecycle.coverage":"paired"
  }
}
```

Finish has a different `event_id` ending `:finish`, the same operation/attempt/actor, `name=retrieval.completed`, phase `finished`, status `ok`, and approved scalar result count. Failure uses status `error` plus bounded error category, never raw exception text. Canceled and skipped are explicit outcome attributes rather than collapsed into success/error. Emit immutable serialized canonical batches once; retransmission must preserve bytes, including observation timestamps. Re-normalizing retries can introduce timestamp differences and identity conflicts.

Profile/run identity is source-assigned. SDK default counter IDs can repeat across fresh services; scope all of them under an explicitly generated producer-instance/session namespace. Do not use a bare `run-1` or `evt-1` globally. A production profile binding must name its source manifest version. Demo names are aliases only.

All observations pass an allowlist: IDs, bounded public display labels, enumerated status/capability/phase, timing, counts, hashes, scoped refs and bounded failure code. Exclude prompts, model response/thinking, message bodies, query text, retrieved chunks, URLs with secrets, shell text/output, absolute private paths, tool inputs/results and credentials. Canonical content-free does not by itself make arbitrary strings in `attributes` safe: validate the field-specific policy before persistence. Inspector text is fetched separately through an authorized source resolver, HTML-escaped, size-bounded and optional. Unknown attributes are not forwarded.

## 3. City semantic envelope

```typescript
type Quality = 'observed' | 'source-snapshot' | 'derived';
interface EvidenceRef {
  sourceInstance: string; producer: string; recordId: string;
  sourceSequence?: string; canonicalTraceId?: string; canonicalSpanId?: string;
  sourceOccurredAt?: string; occurredTimeQuality: 'exact' | 'coarse' | 'unknown';
  observedAt: string; canonicalHash: string;
}
interface CityEvent {
  schema: 'agent-city.event.v1';
  eventId: string;              // deterministic hash of source identity + mapping kind/index
  cursor: string;               // gateway epoch + monotonic integer; opaque to clients
  workspaceId: string;
  type: 'execution.observed' | 'operation.started' | 'operation.finished'
      | 'relationship.observed' | 'artifact.observed' | 'source.gap' | 'source.reconciled';
  agentInstanceId?: string;
  runRef?: { namespace: string; id: string };
  execution?: {
    sourceRevision: string; profileId?: string; displayName?: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled' | 'unknown';
    presence: 'online' | 'offline' | 'stale' | 'unknown';
    taskRef?: { namespace: string; id: string };
    workcellRef?: { namespace: string; id: string };
  };
  artifact?: {
    namespace: string; id: string; kind: string; digest?: string;
    resolverId: string; // opaque server-side locator, never arbitrary path/URL
  };
  sourceHealth?: {
    sourceInstance: string; epoch: string;
    reason: 'retention' | 'replacement' | 'overflow' | 'disconnect' | 'schema' | 'reconciled';
    sourceRevision?: string;
  };
  operation?: {
    id: string; attempt: number; capability: string;
    phase: 'started' | 'finished';
    outcome?: 'succeeded' | 'failed' | 'canceled' | 'skipped' | 'unknown';
    locationHint?: string; sourceDepartment?: string; resultCount?: number;
  };
  relationship?: {
    kind: 'handoff' | 'message' | 'parent' | 'artifact-transfer';
    fromInstance: string; toInstance: string; relationshipId: string;
    phase: 'requested' | 'accepted' | 'received' | 'completed' | 'failed';
  };
  evidence: EvidenceRef[];
  quality: Quality;
  completeness: 'complete' | 'partial' | 'unknown';
  adapterVersion: string;
}
```

This interface is descriptive: implementation must generate a strict discriminated union and matching JSON Schema. Required payload per type: `execution.observed` requires agentInstanceId, runRef and execution; operation events require agentInstanceId, runRef and operation; relationship requires relationship; artifact requires artifact and runRef; source.gap/source.reconciled require sourceHealth. Reject all other payload branches for each type. Every event requires nonempty evidence, workspace and adapter version; exception: gateway-generated gap markers carry the last known canonical evidence ref or a typed gateway diagnostic ref with its own hash, never a fabricated source record. Use a distinct `EvidenceRef.origin: 'canonical' | 'gateway-diagnostic'` discriminator in generated types/schema. Namespace opaque IDs are 1–160 characters, public labels ≤80, references ≤24, evidence links inline ≤24 (overflow uses a paged set ID), operation attempt integer ≥1, counts nonnegative integers, timestamps validated ISO UTC when exact, and normalized serialized size ≤16 KiB. Schema disallows unknown properties. Execution sourceRevision is an opaque owner revision/evidence cursor, never compared lexicographically across sources. No arbitrary `sprite.x`, `walkTo` or backend-authored animation script belongs in it.

Operation identity is `(sourceInstance, namespace, run, operationId, attempt)`. A logical request ID can group attempts but must not collapse them. Dedup logical MCP client/server observation by explicit call reference plus role; preserve the second span as related evidence rather than pretending it is a second tool call. If no shared reference exists, display uncertain cardinality, not a guessed match by timestamp/tool name.

Source hook IDs may be content hashes, not occurrence IDs. Dispatch repeats can collide if identical payloads hash equally: bridge uses durable source file generation + complete-record ordinal + run/step/attempt; preserves the original ID as evidence. **Dispatch's existing sink deliberately omits the trailing newline**, prepending a separator on the next append. A reader that waits for newline would withhold the latest start until the next event. Its adapter must parse a complete valid JSON object at EOF under that documented framing, retain an incomplete fragment, then consume the next separator without replaying the prior object. Do not guess completeness by counting braces inside strings. Alternatively add a separate explicitly versioned strictly terminated NDJSON sink; do not silently change legacy framing. Checkpoint byte offset and source fingerprint only after downstream canonical batch acceptance; file rotation/replacement/truncation produces a source reset/gap, never an implicit continuation.

## 4. Watchdog feed contract and required gap hardening

**EXISTS TODAY**:

- `GET /telemetry/v2/jsonl?cursor=<opaque>&limit=500` (max 5000).
- Each JSONL wrapper has `jsonl_version`, `schema_version`, `exported_at`, `producer`, `record_id`, numeric `sequence`, canonical `record`.
- Headers: `X-Watchdog-Next-Cursor`, `X-Watchdog-Record-Count`, `X-Watchdog-SHA256`, `X-Watchdog-Manifest` (base64 JSON).
- Cursor validates HMAC over `v2:<sequence>`. It is not an epoch, transaction log or source-clock timestamp.
- Canonical store deduplicates exact record identity and rejects conflicting content with `record_identity_conflict`/409.

Gateway verifies page checksum/count and wrapper sequence ordering, validates canonical schema/version, rejects identity conflicts, and preserves opaque next cursor exactly. It never fabricates a Watchdog signed cursor from the exposed sequence. Treat source database restore, cursor-secret change, invalid cursor and malformed page as an explicit recovery condition.

**PROPOSED required before unattended live/replay claim:** add a backward-compatible feed capability/manifest extension in Watchdog with stable `store_epoch`, `retention_generation`, and a retained coverage descriptor. Epoch must change on a new/replaced/restored journal lineage; backup/restore procedure must preserve or intentionally reset it. Retention generation changes on deletion; declare coverage invalidation conservatively if arbitrary time-based deletion removes records in the replay interval. A mere minimum row ID cannot prove no holes. Gateway compares these markers before resuming and source reconciles on a mismatch. Test rotation/restore and middle-history deletion. Do not assume sequence IDs are contiguous: rejected transactions or deletion can create gaps.

Until that extension is implemented and tested, local Phase 0 can use an explicitly retained, nonrotating journal with manual source reset. Phase 1 acceptance requires either the extension or a supported conservative reset-on-every-reconnect policy with full retained export and source snapshot reconciliation; it cannot advertise lossless continuity across unknown retention/restore. The default build path is the extension, not silent guessing.

The canonical native adapter preserves original `event_kind` in `attributes["watchdog.native.event_kind"]` while mapping session/artifact/error kinds into internal kind. Consult the original attribute for those mappings. For instantaneous observations it may not retain source occurrence time as `started_at`; preserve approved source occurrence milliseconds in a bounded explicit attribute at the producer edge and mark precision. Inspect canonical output fixtures; do not mistake gateway `observed_at` or conversion time for when work happened.

## 5. Gateway transaction and synchronization

One active reader per configured source. Read the next bounded page, normalize and validate, then in one local projection transaction:

1. Confirm current source epoch/cursor and accepted hashes.
2. Insert unseen normalized event IDs with monotonic local sequence (64-bit integer stored/transmitted as decimal string).
3. Apply truth reducer and update the materialized snapshot.
4. Store the accepted source cursor and coverage markers.
5. Commit; publish only committed events to clients.

If the process crashes before commit, re-read the same page and dedup. If after commit but before publication, SSE reconnect replays from the projection journal. Conflicting payload under an existing ID is quarantined with visible source fault; do not last-write-wins it. Cursor advances for valid unmapped canonical records too, but records an unmapped count/capability coverage diagnostic. Unknown schema is not “nothing happened”: stop that source and show unsupported version.

Snapshot API `GET /api/world/snapshot` returns `{schema, epoch, cursor, versions, sourceHealth, runtimeAgents, artifacts, relationships}` from one consistent read transaction. Version set includes normalizer/protocol/core/policy/world/identity manifests. Browser installs snapshot at N then requests events after N. Source events arriving in between are journaled and replayed; no fetch-then-subscribe race. Event stream is one multiplexed read feed per client, not one per agent.

Proposed endpoints:

| Endpoint | Purpose | Behavior |
|---|---|---|
| `GET /api/world/snapshot` | Current derived truth + cursor | Authorized workspace, atomic snapshot |
| `GET /api/world/events?after=N` | SSE | `id` is opaque cursor; bounded resume |
| `GET /api/world/history?after=N&limit=200` | Paged JSON fallback/timeline | Same event semantics and scope |
| `GET /api/evidence/:id` | Authorized metadata/deep link | Allowlisted resolver, no arbitrary filesystem URL |

SSE events: `world` for semantic event, `reset` for required new snapshot, heartbeat comments every 15 seconds. Missing/expired/mismatched cursor returns a reset contract before any deltas; clients close and fetch a new snapshot. Native EventSource reconnect uses Last-Event-ID; server handles header plus initial `after` consistently (header wins only if same epoch and valid authorized stream). Do not put auth tokens in the query. Same-origin HttpOnly session; fetch-stream parsing is an alternative when bearer headers are required. [WHATWG SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html).

Disconnect a client above 1 MiB/1000 pending events and let it recover from its last applied cursor. Client applies idempotently by cursor+event ID, never acknowledges mere receipt before validation/application. Cursor gaps are assessed by server-issued stream reset/coverage; a filtered workspace sequence may legitimately skip IDs. Bound histories and return pagination metadata. If native SSE is unavailable, poll **gateway** JSON history, not producers. Browser WebSocket does not itself supply backpressure; no benefit for read-only MVP. [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events), [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

Source health: last successful page time, last lifecycle observation time, accepted coverage, backlog, unknown mappings and gap state are distinct. An empty successful page means connection healthy, not all agents idle. A stale interval (default 10 seconds without successful source read) changes observation freshness, never task status. Presence offline requires explicit producer evidence. Collector overload makes truth partial/unknown and visibly counts loss if producer counters support it; no false task failure.

## 6. Reducer transition rules

| Input situation | Truth action | Presentation action |
|---|---|---|
| First valid start | Add active operation; retain occurrence | Queue/merge meaningful visit |
| Matching finish | Terminalize that attempt immediately | Finish current visit or mark queued visit recent |
| Finish arrives before start | Create terminal operation with partial start coverage | Recent evidence only; no active reading |
| Late matching start after finish | Fill missing evidence/time; never regress terminal | No new live visit |
| Exact duplicate | No state/count change | No new movement |
| Conflicting terminal outcome | Quarantine contradiction pending owner reconciliation | Source alert; never arbitrary green success |
| Failed attempt then retry start | Keep failure, create distinct active attempt | Retry marker/current station |
| Unknown agent | Unbound evidence bucket until explicit binding | No invented named sprite |
| Cancellation | Preserve canceled outcome; no implicit success | Stop routine plans at safe tick |
| Source gap | Freshness/coverage unknown for affected executions | Freeze outdated live poses, show stale marker |
| Owner snapshot reconciliation | Record correction with provenance/revision | Rebase to current activity; do not invent missing route |

An absent task-completed event cannot be inferred from no active tools. Failure alerts carry their own IDs and recovery references, so one later unrelated success cannot clear them.

## 7. Presentation algorithm and replay

At each integer 20 Hz tick, apply all journal inputs scheduled through that tick; update truth first. Select high-priority operations and update merge windows in stable instance/operation order. For live timing, derive tick assignments from recorded gateway accepted time; never use wall-clock reads inside a reducer. Record quiet-window close/collapse decisions or deterministic tick inputs so playback under the pinned policy yields the same plans. Semantic replay does not require the same real network pacing. Exact historical visual replay requires those presentation timing/camera inputs too.

Within each activity window retain counts, first/last occurrence, terminal outcome counts, active operation IDs and paged evidence links. A list of 15 micro-events is retained in the journal but represented by one visit. Across capability switches, no more than six routine pending plans per instance; older routine plans collapse to recent summaries at lag >3 seconds. Priority incidents and approvals update truth immediately and remain inspectable even if their animation is interrupted. Enter/exit has a 100–150 ms display wipe, not an execution lock.

Replay package:

```text
manifest.json       schema/core/adapter/policy/map/identity hashes, coverage, source refs
events.jsonl        normalized, redacted accepted observations in journal order
snapshots/          periodic consistent truth snapshots, checksums, cursor
presentation.jsonl  optional window decisions / camera inputs / tick assignment
source-manifest.json  pinned Watchdog/Relay export hashes and archive locators
```

MVP checkpoints every 500 accepted events or 30 seconds of recorded ingest time; checkpoint on terminal run too. Retention default proposal: 24 hours for hot derived journal; explicitly exported run packages remain until operator deletion policy. Never purge data needed by an active replay without reporting retention boundary. Disk full stops capture and surfaces coverage loss while the Kujo run continues. Do not claim durability if producer spooling is best effort and dropped observations are not measured.

Seeking installs nearest earlier snapshot and reduces forward. It never issues commands. Version migration creates a new derived package with `derivedFrom` hash, not edits original history. Persist all input versions; upgraded policy can yield a new interpretation but must not be labeled identical old playback. Semantic checksums serialize sorted keys and integer fields. GPU pixels can differ across devices; compare browser screenshots only within a pinned test environment.

## 8. Mandatory adversarial fixtures

- start→finish, finish→late start, duplicates, conflicting IDs, retry→success, cancel, approval wait;
- same display name/two instance IDs; repeated default `run-1` in different namespaces;
- 15 retrievals/4 seconds; 20 MCP calls with paired client/server evidence; concurrent capabilities;
- actual 300 ms retrieval with 2-second presentation; inspector terminal before visit ends;
- source reconnect, invalid signed cursor, epoch change, partial last JSONL line, source rotation;
- retained-history deletion, empty page, unsupported schema, corrupt page hash and unknown mappings;
- SSE disconnect after commit/before send; snapshot/stream race; slow client overflow;
- source clock skew, coarse timestamps, predecessor chain distinct from causal parent;
- eight-hour replay with bounded history/textures; hidden-tab resume without catch-up storm;
- untrusted labels and secret-shaped attributes excluded before journal/SSE output;
- no logical operation/event generates a tool call during replay.

These fixtures are the correctness gate for expanding the city. The research pack does not claim they have been implemented or passed.
