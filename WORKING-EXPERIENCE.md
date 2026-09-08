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
- [x] Demonstrate actual RAG and explicit MCP retrieval in provider-backed missions,
  with evidence-backed Library/MCP travel. See the live MCP/character checkpoint below.
- [x] Run generated small JavaScript functions against explicit cases in isolated
  Chromium workers. Actual failed and later repaired/pass attempts are retained.
  This does not establish arbitrary host-project or Workcell execution support.
- [x] Preserve/display real draft and reviewer responses with source-qualified authorship.
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

## Explicit MCP read and local tryout guide

Mission Command now offers an opt-in read of the existing local MCP demo README.
The SDK registered tool performs the actual read before the provider request;
its returned source reaches both writer and reviewer. This is an explicit user
request, not an autonomous model-selected tool invocation. Lifecycle metadata
preserves actual server/tool/invocation/attempt/outcome and excludes the source body.

The controlled provider contract passes with a real isolated MCP server and RAG;
this new MCP path still needs a genuine-model visual proof. Two local adapter
issues were fixed without sibling changes: interpreter `has_key` can return an
integer, and registered handler closure mutation cannot be used to return source
content to the caller. Use the SDK tool result instead. Source success is retained
even if later mission processing fails.

`TRY-AGENT-CITY.md` provides startup, model setup and small writing/function-check
examples. Current screenshots were inspected against the supplied references:
the art is still materially simpler, and direct player controls/free-form chat are
not implemented. The full objective and production release remain incomplete.

## Live MCP and original character checkpoint

Real local-model cohort `evidence/live-missions/live-1788878052721-` proves the
explicit SDK-registered MCP read through Watchdog, gateway and a visible MCP station.
The same writer had earlier visited the Library. Actual MCP server/tool/invocation
and attempt metadata are retained. The code task completed but failed all four
checks due to CommonJS output; runtime completion was not reported as test success.

Subsequent cohort `evidence/live-missions/live-1788878402902-` uses the actual
previous failure in its repair task and passes all four explicit cases. Both
attempts remain. Its writing track also proves the new original canine character
atlas through Library ladders and MCP travel. `writing-17.png` shows Completed
truth with a RECENT successful MCP activity. No source work waits for animation.

`assets/source/characters.json` authors eight palettes and separate city/interior
silhouettes; the deterministic compiler emits a 23,712-byte PNG atlas with
1,720,320 decoded RGBA bytes. The fourteen pose slots are projection assets;
world-core still determines which poses have evidence. Static DOM portraits share
the atlas, and execution-instance badges remain distinct from profile appearance.

35 tests, typecheck, boundaries, maps/build and seven-room browser/keyboard/320px/
DOM-only checks pass. The pinned 47-event semantic replay hash is unchanged.
This closes the genuine-model MCP proof gap; varied city architecture, richer
room scenery, broader conversational/task workflows and release hardening remain.
No eight-hour soak was started; no sibling repositories were changed.

## City architecture and truthful Dojo display

The six plots now have distinct rooftop silhouettes: command tower/antenna,
columned Library, skylit industrial Workshop, network rack house, tiered Dojo and
meeting pavilion. Stone embankments, bridge decks, water texture and road paint
follow the existing cells; portal coordinates and navigation graphs are unchanged.
Dispatch consoles, empty meeting furniture and cable trays add original room detail.
These static props do not represent participants, messages or operations.

Dojo outcome display now uses world-core station mapping rather than matching
literal station names inside operation IDs. This fixes missing function-check
failure/pass history on the content station. Truth-dependent room backgrounds now
invalidate on snapshot replacement, including different snapshots with equal order.

`evidence/cityscape/proof.json` and `dojo-real-history.png` verify actual retained
failed/pass function-check outcomes from the two preceding real-model cohorts.
The renderer pixel check detects both labels; a clearly separate empty-snapshot
negative control proves prior outcomes clear even with the same event order.
This is replay/rendering verification, not a new source execution claim.
Seven-room browser/keyboard/320px/DOM-only and 35 tests/build pass. Full original
reference fidelity, conversational/task continuation UX and release gates remain.

## Mission continuation and actual repair

Mission history now supports Continue / repair. Each submission starts a new
execution with explicit parent/root mission identity, the original task, previous
request, bounded actual prior output and actual check results. Context remains in
private mission files, outside telemetry. Unknown/unfinished missions cannot be
continued. The UI loads prior function cases visibly and clears retrieval options;
the user request and source-qualified model responses remain inspectable.

Explicit function contracts now reach both coder and reviewer model instructions,
and remain available even when provider execution fails. A model can still ignore
them; checks, rather than the response text, determine the recorded test outcome.

Real cohort `evidence/live-missions/live-1788879939420-/` retains five missions:
one writing/MCP mission, one failed code result, two failed follow-ups, and a final
targeted repair passing all four cases. No failed attempt was overwritten. The
final collection is LIVE but retains a gap from service restarts; this is not a
gap-free reliability proof. See that directory's README for exact identities.

36 tests, typecheck, boundaries, maps and build pass. Controlled source contracts
and browser checks cover continuation identity/context, visible cases, keyboard,
320px layout and DOM-only use. The controlled model and UI fixture are explicitly
separate from the real Ollama proof. No sibling changes or eight-hour test.
Full reference fidelity, packaging and outstanding release/reliability gates remain.

## Bounded renderer reuse and scale checkpoint

Visible character containers/sprites/marks and building hit targets now survive
ordinary ticks. Offscreen/removed actors are released, with no retained cache for
500 instances. Selected/followed execution identity survives scene changes. At high
counts, buildings display explicitly labeled visual occupancy totals; these do not
claim runtime activity. Read-only diagnostics count the complete display tree.

`evidence/renderer-scale/README.md` records 5/25/100/500 synthetic profiles. Actor
replacement fell from every measured frame to none. At 25 visible instances,
draw p50/p95 changed from 5.1/8.1 ms to 3.1/4.1 ms. High headless frame intervals
remain unqualified for 60 FPS; no throughput or long-duration claim follows.
Baseline/after initial pixels match; separate short checks cover portal-follow
identity, real building hit testing, aggregation and object removal. No world-core,
source repository, runtime business behavior or eight-hour test changed.
