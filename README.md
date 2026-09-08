# Kujo Agent City

**Working-experience expansion in progress:** [current capabilities and unfinished gates](WORKING-EXPERIENCE.md). Run `npm start` (Node 24+) or open `Start Agent City.command` on macOS. Model setup and explicit writing/code missions are now separate from the read-only Observer. Existing Observer notes below are historical where they say no task controls.

Agent City observes real Kujo work in a small original pixel city. The Observer
and replay gateway remain read-only; **Mission Command** is a separate local
service for explicit writing/code requests and SDK reviewer handoffs.

## Start and try it

Requirements: Node 24+, installed npm dependencies, the Kujo 1.3.1 repository
binary, and sibling `agents-sdk`, `dispatch`, `watchdog`, `rag`, `eval`, `mcp`
repositories. This is a local development application, not a standalone public
release.

```sh
cd /Users/robertdevore/2026/Kujolang/kujo-repos/agent-city
npm start
```

Or double-click **Start Agent City.command**. Open **http://127.0.0.1:5178**.
If the launcher reports the port is occupied, stop your previous launcher with
Ctrl+C first. It does not kill existing processes. Ctrl+C stops the new launcher.

In **Mission Command → Model connection**, use a compatible chat-completions
endpoint/model/key. For the local Ollama model installed on this machine:

- Endpoint: `http://127.0.0.1:11434/v1/chat/completions`
- Model: `qwen2.5-coder:1.5b-instruct`
- API key: leave blank.

Ollama must be running. This small model is suitable for trying the workflow;
model output still needs review. No quality guarantee follows from a successful
runtime receipt.

Choose **Writing + review** or **Code + review**, enter a small task and press
**Start mission**. Optionally select **Use indexed local Kujo docs**; the starter
index contains four short example documents, not the full ecosystem manual.
Select the resulting WRITER or CODER execution in the roster, then **Follow
selected instance**. Click a mission-history entry to read the recorded draft,
reviewer response and final artifact.

Execution instances appear when actual work is observed. No decorative workers
are preconfigured as live agents. The SDK creates the writer/coder and reviewer
for each mission; profiles are appearances, not interchangeable identities.
Code artifacts are **saved and reviewed, not executed**. Free-form group chat,
manual character movement and game combat are not implemented.

## Truth and privacy

Runtime truth updates independently of travel. LIVE is current observation;
RECENT is completed work being presented; UNKNOWN and STALE are explicit.
Follow keeps one execution identity through portals. Retained history does not
invent new live travel after reload. Replay never runs source work and disables
mission commands.

Provider credentials stay in private local server configuration. Raw mission
prompts and model output are stored in private mission files for explicitly
requested inspection, not broadcast in canonical telemetry/SSE. The local
Watchdog token remains server-side. `.runtime/` is ignored by Git.

`packages/protocol` owns validation/types; `world-core` owns pure deterministic
truth/presentation; `renderer-pixi` projects it. `apps/gateway` owns the derived
journal and read endpoints. `apps/runner` owns local commands. The existing
Watchdog native adapter is the observation seam; no universal broker is added.

## Check the build

```sh
npm run verify
npm run replay -- evidence/missions/replay.json
npm run proof:mission-contract # synthetic provider; real SDK/Dispatch/RAG
npm run proof:mission-browser
```

`CHROMIUM_PATH` selects an installed Chromium executable when needed. The real
local-model proof is `npx tsx scripts/live-mission-proof.ts`; it makes actual model
calls, uses isolated service ports and retains evidence under `evidence/live-missions`.

See [current unfinished requirements](WORKING-EXPERIENCE.md),
[original slice evidence](BUILD-RESULT.md), and the historical reports below.
The five supplied visual references are the target. Current original artwork is
still an early approximation, not an approved visual match.

## Phase 1 Observer expansion

The current release/evidence index is [RELEASE-PHASE-1.md](RELEASE-PHASE-1.md).
It supersedes the original slice's current-state/next-step section while retaining
that report as historical evidence. All six rooms are inspectable; actual MCP,
Dispatch task, SDK/RAG/handoff, Eval failure/repair and guarded Workcell invocation
observations use the existing Watchdog seam.

For a fresh local review:

```sh
CITY_SOURCE_PREFIX=phase1- CITY_DB="$PWD/.runtime/observer-phase1.sqlite" npm run local
CHROMIUM_PATH=/absolute/path/to/chromium npm run proof:phase1
```

The launcher also starts the local Kujo MCP demo server when no server is already
listening at its health endpoint. The proof invokes actual local work, including
an intentionally failing Eval check and a subsequent correction. The UI remains
read-only. `npm run workcell` uses a dedicated generated fixture repository and
preserves the host's Workcell guardrails; this machine rejects container execution
because AppArmor is unavailable. The failure is an observed preflight, not work
inside a container.

The retained release cohort uses `CITY_SOURCE_PREFIX=phase1-release-` and
`.runtime/phase1-final.sqlite`. No historical travel is fabricated on a page
reload. Follow a newly invoked execution to watch live/RECENT portal travel;
retained truth and all operation evidence remain inspectable after it ends.

Original appearance definitions are in `packages/renderer-pixi/appearance.ts`.
Maps have unbound authored capabilities; runtime station health is derived from
observations. Reference images and protected game sprites are not embedded.

### Hardening candidate (0.2.0-rc.1)

Release qualification currently **FAILS**. See [bounded blocker update](RELEASE-BLOCKERS.md) and [measured hardening report](RELEASE-HARDENING.md) before treating this as a release-ready application.

- Open **Archive / Replay / Incidents**, browse a run, inspect its attempts or replay its pinned journal. Return to Live explicitly.
- `npm run replay -- evidence/missions/replay.json` verifies a pinned redacted bundle offline without source execution.
- `npm run stress`, `npm run proof:hardening`, and `npm run soak` write bounded synthetic/browser evidence. The default soak is only 180 seconds; `SOAK_SECONDS=28800 npm run soak` requests eight hours, but its current stationary workload is not a substitute for a live ingestion soak.
- `npm run gate` intentionally exits nonzero while mandatory release gates remain incomplete.
- `?renderer=off` selects DOM-only presentation. `CITY_LEDGER_DIR` selects an explicit local RunLedger directory; raw receipt prompts/notes/output are excluded.
- The gateway now retains event identities and stops ingestion at `CITY_JOURNAL_LIMIT` (default 1,000,000 events). It does not delete evidence to make room. Back up/review the local journal before changing that limit.
