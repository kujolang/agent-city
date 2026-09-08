# Agent City working-experience build — in progress

The active objective is the complete local game-like agent experience described
by the user, not merely a passing Observer demo. **Not complete or release ready.**

## Current implementation

- The five references supplied September 8 are now recorded by SHA-256 in
  `research/visual-reference-manifest.json`. Original rooftop materials, room
  masonry/lighting, knowledge shelves and command-centre framing replace part
  of the original placeholders. This is a first art pass, not fidelity approval.
- `apps/runner` owns explicit local mission commands. It is separate from the
  read-only gateway and pure semantic/presentation packages. One mission runs
  at a time; local origin and per-process command token are required for writes.
- Mission Command offers provider configuration, writing/code task submission,
  a real SDK reviewer handoff, status and private reviewed output. No offline
  model fallback exists. Configuration means configured, not verified reachable.
- Provider keys stay in private server configuration and never appear in status,
  SSE or the lifecycle journal. Prompts/results live in private mission files,
  not telemetry. Responses render as text. Provider redirects are rejected.
- Replay disables mission commands. Opening/replaying evidence does not start
  a model. The existing pinned 47-event corpus retains its semantic state hash.
- `npm start` prepares the local docs index if needed and launches the services.
  macOS users may open `Start Agent City.command`. Existing processes are not
  silently killed. Model configuration is available inside Mission Command.

## Verification evidence

- `evidence/missions/contract.json`: **synthetic model endpoint**, real SDK run,
  started before controlled completion, two-request reviewer handoff, metadata-only
  spool, private artifact, provider failure, redirect rejection and local command
  authorization. This is not the required live AI product proof.
- `evidence/visual-revision/browser.json` and seven room screenshots: actual
  renderer, keyboard setup, 320px layout and DOM-only task form. Retained source
  truth is displayed honestly as stale where appropriate.
- `npm run verify`: TypeScript, architectural boundary, maps, tests and build.
- `npm run replay -- evidence/blockers/replay.json`: pinned real semantic hash
  `a03059a108c9d041ecec0a99a64c43f0b6be3d3383dc4c2d9048aa7649de6c58`.

## Completion requirements still open

- [ ] Configure an actual model and record writing and coding missions through
  Watchdog/gateway into the visible city; fixture calls cannot satisfy this.
- [ ] Bring new mission intake/assignment through actual Dispatch task state.
- [ ] Demonstrate retrieval/tool use in these provider-backed missions. Current
  new mission entry point generates/reviews text; earlier Observer demos remain
  the evidence for real RAG/MCP activity.
- [ ] Run generated code and meaningful checks inside a supported isolation
  boundary. Current code outputs are reviewed files, **not executed/tested code**.
- [ ] Preserve and display the actual intermediate draft/review exchange with
  source-qualified authorship. Do not invent conversation from handoff metadata.
- [ ] Finish reference-led city variation, multi-level interiors, character art,
  accessible compact controls and visual review against all five images.
- [ ] Verify end-to-end task controls in Chromium, interruption/restart behavior,
  onboarding and release packaging; add missing security/recovery coverage.
- [ ] Resolve full-path throughput and outstanding reliability gates. The user
  cancelled the eight-hour test; do not restart it or schedule another silently.

No live model credentials were found in this task's environment. The user was
asked which provider to use; that answer remains pending. They can configure a
compatible chat-completions endpoint/model/key in the local application.

## Scope and limits

Local host only; no public multi-user hosting claim. Last 100 command receipts
are browsable; private output files remain retained. Service restart marks
previous running receipts UNKNOWN rather than inventing an execution outcome.
Existing Observer proof scripts remain explicitly offline-model demonstrations.
The active Codex goal stays open until the full requested experience is proven.
