# Kujo Agent City

A local, read-only Observer vertical slice. Real Kujo operations drive a small
original pixel city; current truth updates independently of travel and room
animation. The web UI cannot assign, stop, chat with, or reconfigure workers.

[Build report and gates](BUILD-RESULT.md) · [Library proof](evidence/03-library-truth.png) · [Video](evidence/vertical-slice.webm)

## Run locally

Use Node 24+ and the Kujo **1.3.1** repository binary. The shell's older `kujo`
may not satisfy SDK context contracts. Keep `agents-sdk`, `dispatch`, `watchdog`,
`rag`, `eval`, and `kujo` as siblings. Required source changes are pinned in the
build report. No provider credentials or paid model call is required.

```sh
npm ci
mkdir -p .runtime
export KUJO_BIN="$(cd ../kujo && pwd)/target/release/kujo"
(cd ../rag && KUJO_RAG_INDEX_PATH=../agent-city/.runtime/rag.json "$KUJO_BIN" run main.kujo --interpreter ingest --path ./examples/kujo_docs --recursive true --namespace agent-city)
npm run local
```

Open **http://127.0.0.1:5178**. The supervisor starts the local RAG service,
Watchdog, canonical bridge, gateway and Vite. Watchdog requires the generated
private token for intake/export and proxy access; the gateway listens only on
loopback. Local state, tokens, spools and databases stay under ignored
`.runtime/`. The source journal must remain retained during a review session.
Stop the supervisor with Ctrl+C. If a recovery test has replaced its gateway,
the replacement PID is recorded in `.runtime/pids.json`.

In another terminal, explicitly run the real proofs:

```sh
npx playwright install chromium
npm run proof          # Dispatch -> SDK -> real RAG, controlled test barrier
npm run demo           # actual SDK child handoff and Eval failure/repair
npm run recovery       # stops the gateway; proves real work still completes
```

`CHROMIUM_PATH` may select an already installed browser. The browser version is
recorded in proof receipts. The proof scripts are development commands; they
are not exposed as city controls. `CITY_SOURCE_PREFIX` scopes a review cohort;
`CITY_DB` selects a separate derived projection. Use matching values in the
supervisor and proof commands. Defaults are `review-` and `.runtime/review.sqlite`.
The completed session uses `milestone-` and `.runtime/milestone.sqlite`.

## What is implemented

- Strict JSON Schema with generated TypeScript, immutable evidence references,
  distinct run/operation/attempt/task/profile/execution identity.
- Watchdog canonical feed validation: schema, checksum, manifest, cursor,
  ordering, wrapper identity and bounded pages. Transactional SQLite journal,
  consistent snapshot, paged history, resumable SSE and metadata evidence links.
- Pure reducer, terminal monotonicity, retry evidence, deterministic graph
  navigation, 20 Hz presentation and four-second activity compression.
- Original 256×240 PixiJS 8/WebGL world, 16×16 cells, 32-pixel HUD,
  Tiled JSON source and validated compiled maps. Workshop, Library, MCP Terminal
  and Dojo interiors; all six required city landmarks.
- Instance selection, Follow, scene inspection, pause/reduced motion, DOM truth,
  recent visual activity and evidence. No business controls.
- Real SDK lifecycle observation with bounded local spools and fail-open sink;
  actual Dispatch handler, RAG retrieval, child handoff and Eval results.

LIVE denotes observed current activity or collection health. RECENT denotes
observed completed work shown after it finished. UNKNOWN is explicit when no
owner identity, current presence, task status or capability source is available.
STALE denotes interrupted observation. REPLAY is tested offline; a replay UI is
not implemented and loading a snapshot does not invent historical live travel.

A healthy HTTP feed alone does not establish healthy collection: bridge
heartbeats and spool overflow also affect coverage. Reconnect marks retained
history partial; current terminal outcomes remain intact. This local slice does
**not** claim lossless continuity through Watchdog restore/retention changes.

## Packages and verification

`packages/protocol` owns semantic validation/types. `packages/world-core` owns
pure truth and presentation. `packages/renderer-pixi` projects those states.
`apps/gateway` owns the derived journal and read endpoints. `apps/web` composes
Pixi and readable DOM. `integrations/kujo` reuses Watchdog's native normalizer.
No separate orchestration engine or general event broker is introduced.

```sh
npm run generate
npm run maps
npm run verify
```

The test suite includes synthetic adversarial cases and a retained real trace.
Only actual producer runs are used for the visual acceptance proof. Maps were
authored as Tiled-compatible JSON; no Tiled GUI session is claimed. Artwork is
original geometric placeholder art; see [provenance](assets/source/PROVENANCE.md).

The implementation stops at this Observer vertical slice. Full production
hardening, MCP live instrumentation, replay UI and broader source coverage are
explicit later gates in the [build report](BUILD-RESULT.md).
