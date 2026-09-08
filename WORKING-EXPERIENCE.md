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
- `npm run replay -- evidence/missions/replay.json`: pinned real semantic hash
  `a03059a108c9d041ecec0a99a64c43f0b6be3d3383dc4c2d9048aa7649de6c58`.

## Completion requirements still open

- [x] Configure an actual model and record writing and coding missions through
  Watchdog/gateway into the visible city; fixture calls cannot satisfy this.
- [x] Bring new mission intake/assignment through actual Dispatch task state (real engine contract and persisted owner receipt verified).
- [ ] Demonstrate retrieval/tool use in these provider-backed missions. Current
  new mission supports opt-in local-doc retrieval, verified against an actual isolated Kujo RAG server with fixture model responses. MCP in a provider-backed mission remains open.
- [ ] Run generated code and meaningful checks inside a supported isolation
  boundary. Current code outputs are reviewed files, **not executed/tested code**.
- [x] Preserve/display draft and reviewer responses with explicit source-qualified authorship. Controlled response tests pass; live-model content proof remains open.
- [ ] Finish reference-led city variation, multi-level interiors, character art,
  accessible compact controls and visual review against all five images.
- [ ] Verify end-to-end task controls in Chromium, interruption/restart behavior,
  onboarding and release packaging; add missing security/recovery coverage.
- [ ] Resolve full-path throughput and outstanding reliability gates. The user
  cancelled the eight-hour test; do not restart it or schedule another silently.

No cloud credentials were supplied. After the optional provider question remained
unanswered, the existing local Ollama service was used with the downloaded
`qwen2.5-coder:1.5b-instruct` model. The connection is saved privately for the next
normal launcher startup. This was an implementation assumption, not an explicit
user choice of model. A different compatible provider can be configured in-app.

## Scope and limits

Local host only; no public multi-user hosting claim. Last 100 command receipts
are browsable; private output files remain retained. Service restart marks
previous running receipts UNKNOWN rather than inventing an execution outcome, then reconciles them only from atomic owner completion receipts. New admission remains blocked while recovery is unresolved.
Existing Observer proof scripts remain explicitly offline-model demonstrations.
The active Codex goal stays open until the full requested experience is proven.

## Runtime / navigation continuation

Dispatch intake, SDK execution, local RAG and the reviewer now share source-owned
run/task references. Model response records use explicit per-agent model-policy
bindings, not names inferred from text. They stay in private mission files; the
metadata spool contains neither prompts nor response text.

The controller was killed during a held model request in the contract test. The
source continued; a restarted controller kept the same mission UNKNOWN/busy until
the actual atomic receipt reported completion. History storage failures disable
commands. These checks remain explicitly synthetic-provider tests.

City entrances now meet the drawn thresholds. The navigation graph is compiled
from authored street/walkway cells, includes the lower street, and checks doorway
connectivity. A retained real retrieval test confirms identity and a visible
threshold tick before the Library scene transition. Old replay bundles retain
their previous map/core pins; the same 47-event real corpus is repinned at
`evidence/missions/replay.json`, with unchanged semantic truth hash.

## Genuine local model checkpoint

`evidence/live-missions/live-1788874461949-/proof.json` records two real local-model
missions, four completed source-qualified execution instances, LIVE collection,
no observation gap and no browser errors. The writing track records city travel,
Library entry/read/return, Workshop return and completion; the same instance
survives every scene. Draft/reviewer texts are actual provider output.

The first attempt at `live-1788874278501-` failed the browser acceptance check:
empty optional `relatedInstance` metadata caused gateway quarantine. The bridge
now omits empty optional values; strict gateway validation remains intact. The
failure is retained in Casefile `2026-09-08-093418-citylivemetadatagap`. No sibling
repository edits were required. A regression test covers the empty field.

**Runtime success does not mean output quality passed.** The small model's writing
added unsupported module claims, and its code response included Markdown fences
and omitted the requested export. Both raw responses are retained. These artifacts
need review; they are not validated content or tested code. Robust output contracts,
task-aware review and supported isolated code checks remain required before calling
the requested writing/coding experience complete.

Current verification: 31 tests, typecheck, boundaries, authored maps and build pass;
47-event replay hash unchanged; seven-room browser proof, keyboard setup, 320px
layout and DOM-only controls pass. ResizeObserver canvas writes are deferred to
animation frames to avoid resizing during observer delivery.

## Task-aware review and syntax checks

The SDK handoff supplies the draft as child input. City now also explicitly gives
its reviewer the original user task, so requirements are not discarded at handoff.
The controlled provider contract verifies the actual second request contains it.

Code artifacts now undergo a bounded Node parser-only check with an empty child
environment. A single whole-response Markdown code fence is removed; raw model
responses remain retained separately. No module is imported or executed. A test
places a file-writing side effect in valid generated code and verifies the file
is never created; malformed code reports invalid syntax. The output UI separately
labels syntax status, unrun functional tests, and unverified factual accuracy.

Real-model cohort `evidence/live-missions/live-1788874992421-` again completed both
missions and the four-instance browser flow. Code mission
`mission-87c1c628-d48c-4c13-a635-020f8e86857d` returned syntax-valid code after fence
removal, but still omitted the requested export and has incorrect finite-number
validation. This is NOT a functional pass. Writing still contains unsupported
claims. The prior failed/weak attempts remain retained. Current verification:
33 tests, build and real/controlled runtime proofs pass. Safe functional tests,
explicit output contracts and stronger grounded review remain open.

## Isolated functional-check milestone

Mission Command now accepts optional explicit function-case JSON for code tasks.
With cases supplied, generated ES modules run in fresh disposable Chromium workers
with network blocked and no Node bindings. Defaults without cases remain syntax
checks only. Results are separate from runtime completion, and unknown execution
coverage is explicit on checker failure. Installed Chromium revisions are reused
when the configured Playwright revision is absent.

Real mission `mission-02fd801a-1185-4331-b365-7b157d4af2db` failed the cases; subsequent
repair mission `mission-6998b158-66e3-46f3-8dad-2db59c197e18` passed all four. The repair
prompt used the actual preceding failure. Both cohorts are retained. An explicit
function-checker execution emits individual/suite outcomes through Watchdog to
semantic Dojo state; it is not mislabeled as another AI or as a Kujo Eval invocation.
See `evidence/function-checks/README.md` for proof scope and limitations.

34 unit tests/build and controlled recovery contracts pass; isolation/adversarial
checks and real repaired code cases pass. DOM-only inspection shows actual case
results and execution scope. Arbitrary projects, filesystem/network tools and a
hard process-memory quota are outside this small-function execution capability.
Full original game visuals, provider-backed MCP, broader grounded review and release
hardening remain open. The eight-hour soak remains cancelled.

## Authored multi-level Library and Workshop

Both rooms now have real upper walkways and ladders. Station slots are aligned to
the interior navigation graph; travel uses cached routes instead of axis shortcuts.
Ladder animation comes only from actual vertical presentation movement. Library
source classifications choose their authored upper sections; unknown retrieval
stays at the lower query terminal. Deterministic real-event tests verify ascent,
upper station arrival, descent, Workshop return and persistent execution identity.

Fresh real model cohort `evidence/live-missions/live-1788876751607-` records upper
Library travel while current truth remains independent, including completed truth
during descent. 35 tests/build and seven-room/browser/keyboard/320px/DOM checks pass.
Current replay command: `npm run replay -- evidence/world-levels/replay.json`;
its semantic hash remains unchanged. Older pinned bundles are preserved.
The original-reference visual target is still not complete, particularly characters
and city variation. No soak restarted; no sibling source changes.
