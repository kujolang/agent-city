# Kujo Agent City

**[Version 0.2.0](https://github.com/kujolang/agent-city/releases/tag/v0.2.0) — local application:** [current release qualification](RELEASE-QUALIFICATION.md) and [real reviewed Kujo tool/video](evidence/reviewed-release-tool/README.md). [current capabilities and unfinished gates](WORKING-EXPERIENCE.md). Start with the [managed preview installation](installer/README.md) and [first-task guide](TRY-AGENT-CITY.md). Source checkouts use `npm start` (Node 24+). Model setup and explicit writing/code missions are now separate from the read-only Observer. Existing Observer notes below are historical where they say no task controls.

Agent City observes real Kujo work in a small original pixel city. The Observer
and replay gateway remain read-only; **Mission Command** is a separate local
service for explicit writing/code requests and SDK reviewer handoffs.

Managed preview installation now supports staged updates and archive-based uninstall;
see [public preview installation and maintenance](installer/README.md). The repository
is public. Version 0.2.0 supports the documented local workflows; long-duration
reliability, public hosting and unrestricted workflow execution are not certified.

See [supported executable workflows](docs/workflow-support.md) before choosing a team. Imported profiles do not automatically connect their tools.

## Start and try it

Install and launch on macOS or Linux:

```sh
curl --proto '=https' --tlsv1.2 -fsSL https://github.com/kujolang/agent-city/releases/download/v0.2.0/install.sh | sh
```

Then configure your own Ollama or Codex connection. Installation does not submit tasks.

### Kujo author → senior review with your Codex subscription

This local adapter uses the installed Codex CLI and its existing ChatGPT login.
It does not copy OAuth credentials or use an OpenAI Platform API key. It is a
bounded text-provider adapter, not an import of all Codex tools, skills or teams.
Codex owns authentication and account usage limits. Calls use an empty temporary
working directory, read-only sandbox, and disabled shell/apps/browser/web search;
the adapter does not load user config and uses the CLI default model. Temporary
response files are removed after each request. The signed-in CLI must support
the flags in `scripts/codex-provider.ts` (verified with 0.144.4).

Terminal 1:

```sh
CITY_PORT_OFFSET=1000 "$HOME/.local/share/agent-city/start.command"
```

Terminal 2, after the app is ready:

```sh
"$HOME/.local/share/agent-city/start.command" provider:codex --check
CITY_APP_URL=http://127.0.0.1:6178 "$HOME/.local/share/agent-city/start.command" provider:codex
```

The read-only `--check` command checks installed CLI options and login status; it
sends no prompt and changes no City configuration. Missing/outdated CLI or a known
signed-out/API-key login gets recovery guidance. UNKNOWN login status (for example
a local Codex config error) is not a successful authentication check: inspect
`codex login status`; the normal connector may still work because execution ignores
user config. Neither check proves remaining usage quota or model access.

If needed, `codex login` opens the normal ChatGPT sign-in. The adapter listens on
loopback port 6179 and configures the app at http://127.0.0.1:6178 automatically,
using a generated private local bridge credential. Do not enter a subscription
password or copy a Codex token into the model form. Restart the adapter after
restarting the app; it refreshes its local credential. Ctrl+C stops each terminal.
The model-list check recognizes `codex-cli-default` as a connector alias, not a
reported underlying model ID. Only an actual task tests generation.
[Codex authentication](https://learn.chatgpt.com/docs/auth) remains owned by Codex;
Agent City never signs you out or copies its authentication files.

Choose **Kujo + senior review (real MCP)** and submit a small script request.
This mode always reads the actual public `kujolang-mcp` catalog with
`get_catalog_item(slug: kujo)`; it does not use the demo README checkbox. The catalog
provides project metadata, not a complete syntax manual or execution service.
The author draft is saved as private `draft.kujo`; the separate senior reviewer
returns a graded `reviewed.md`. A subsequent `kujo check` validates the draft
without executing it, with its own observed Dojo activity. Grades remain model
opinions, separate from that actual compiler check. No `.kujo` program is run.

Verified real mission: `mission-42cf14f1-9892-4cc7-b952-e603a7721061`.
See [live evidence](evidence/kujo-author-review-codex-checked/README.md).
The 85-profile Kujo agent registry can now be imported and inspected (see below).
Eligible profiles can now be selected for bounded PROPOSE writing/JavaScript draft-review missions; required capabilities must be available.

### Ollama or another chat-completions provider

Source-checkout requirements: Node 24+, installed npm dependencies, the Kujo repository
binary (the pinned managed installer uses 1.7.0), and sibling `agents-sdk`, `dispatch`, `watchdog`, `rag`, `eval`, `mcp`
repositories. The managed preview supplies these dependencies privately; it does
not supply a model account. Production qualification remains incomplete.

```sh
"$HOME/.local/share/agent-city/start.command"
```

Open **http://127.0.0.1:5178**, or the URL printed by the launcher.
If the launcher reports the port is occupied, stop your previous launcher with
Ctrl+C first. It does not kill existing processes. Ctrl+C stops the new launcher.

In **Mission Command → Model connection**, click **Detect local Ollama**, choose an
installed model, then **Check model listing** and **Save connection**. Detection
only contacts local Ollama metadata; it does not install a model or send a prompt.
A successful listing check does not guarantee generation access or task quality.
If Ollama is unavailable, start it first; no provider is silently substituted.

For manual setup, use a compatible chat-completions
endpoint/model/key. For local Ollama, use an explicitly installed model:

- Endpoint: `http://127.0.0.1:11434/v1/chat/completions`
- Model: your installed model’s exact name (shown by `ollama list`).
- API key: leave blank.

Ollama must be running. Choose a model capable of the requested task;
model output still needs review. No quality guarantee follows from a successful
runtime receipt.

For a concrete task with review and optional real execution, follow the
[Kujo quote-tool walkthrough](docs/try-a-reviewed-tool.md).

Choose **Writing + review** or **Code + review**, enter a small task and press
**Start mission**. Optional permissions are under **Tools, files and checks**. Select **Use indexed local Kujo docs** there; the starter
index contains four short example documents, not the full ecosystem manual.
Select the resulting WRITER or CODER execution in the roster, then **Follow
selected instance**. Click a mission-history entry to read the recorded draft,
reviewer response and final artifact. Use **Save reviewed artifact** to download
the saved result. Built-in Kujo missions instead offer **Save author draft**:
the senior review is commentary, not replacement executable code. Check results
remain separate from task completion; unavailable checks show their diagnostic.

Execution instances appear when actual work is observed. No decorative workers
are preconfigured as live agents. The SDK creates the writer/coder and reviewer
for each mission; profiles are appearances, not interchangeable identities.
By default code artifacts are **saved and reviewed, not executed**. A parser checks JavaScript
syntax; this does not run imports, side effects or functional tests. A single
outer Markdown code fence is removed when present; the original response remains
in private response history. The output panel states the actual check status.
To execute small ES modules, expand **Tools, files and checks**, open **Optional JavaScript function checks**, and supply
explicit JSON cases, for example:

```json
{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0}]}
```

These run in disposable browser workers, with no network or Node bindings. Each
case has a 1.5-second timeout. The output panel shows actual case outcomes; this is
not host-project execution or a guarantee beyond the supplied cases. See
[real failure/repair evidence](evidence/function-checks/README.md).

Free-form group chat,
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
npm run replay -- evidence/world-levels/replay.json
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

## Replay and source health

Open **Archive / Replay / Incidents** to inspect runs, evidence and retained failure/pass
attempts, compare runs, or replay a pinned normalized journal. Replay never invokes
models or tools. Return to Live explicitly before submitting another mission.
`?renderer=off` keeps the DOM truth interface available without Pixi rendering.
The gateway stops ingestion at its journal quota rather than deleting evidence silently.

## Team workflows

- **Publishing House:** technical writer → separate copy chief; saved local draft/review.
- **WebOps:** supplied-evidence Reporter → Copy Chief → deterministic report check.
  Supply timestamped evidence; this does not crawl or deploy a website.
- **VideoOps:** Creative Director → Asset Scout → HyperFrames
  Editor → isolated render → exact-candidate human review → explicit finalization.
  Live production, exact-video approval and matching final download are verified.
  See [VideoOps setup and review](docs/videoops.md).

These additions are included in `v0.2.0`.
The [workflow matrix](docs/workflow-support.md) records the executable scope and limits.
The [release follow-through](RELEASE-NEXT.md) retains unfinished acceptance gates.

## Historical evidence

[Phase 1](RELEASE-PHASE-1.md), [initial hardening](RELEASE-HARDENING.md), and
[earlier blockers](RELEASE-BLOCKERS.md) describe their dated checkpoints.
Use [current release qualification](RELEASE-QUALIFICATION.md) for the current evidence
index. A passing metadata check does not establish production readiness.
No eight-hour soak is required, running or claimed.

### In-game conversations, Follow and replay

Start a mission in **Mission Command**, leaving **Allow agent questions** checked.
Actual model responses appear in **Mission Conversation**, directly below the game.
If the model returns a supported question, the source runner waits and a **Reply / continue**
box appears. Reply within three minutes. The answer enters that same agent's context;
normal completion still hands the draft to the reviewer. Each role may ask at most two
questions per model turn; interactive missions have an overall twenty-minute ceiling.
Questions are model-dependent, not scripted dialogue. A model may finish without asking.
A timeout fails the mission honestly; **Continue / repair** starts a separate recorded attempt.
Reopening the page restores a currently running mission's pending conversation.
The private question/answer files are not added to the normalized journal or SSE.

Selecting a roster agent now enables **Follow** immediately. Starting a mission follows
its observed SDK execution automatically, including city paths and building interiors.
The selected execution remains the target; the camera does not silently switch to its
reviewer. Select the reviewer to follow that separate execution. Select **City** or another
building to leave Follow. Reduced motion still pauses visual movement until you resume it.

Under **Archive / Replay / Incidents**, choose **Browse runs**, select a run, and press
**Replay pinned run**. Events now play in recorded observation order instead of loading the
final state at once. Long gaps shorten to two seconds; original timestamps and all events
remain intact. **Pause animation** pauses playback too; **Restart replay** rewinds it.
Replay follows the first observed execution, or whichever roster instance you select.
**Return to live** reconnects to the current snapshot. Replay never runs a model or tool,
and replies/task commands are disabled. Run selection is source-run scoped, so a separate
handoff run must be selected separately. Private chat text is not in this redacted replay.

**Record game video** records the canvas, including replay, to a downloadable WebM (or MP4
where supported). Press **Stop / save video** to finish. Keep the tab visible. Capture is
bounded to five minutes / 64 MiB and includes no audio or DOM conversation/inspector panels.
This is an explicit local recording action, not automatic recording of every session.

Verification: `npm run proof:interaction` uses a controlled model with real SDK/Dispatch
execution and retained real observations for browser replay. `npm run proof:checkin-live`
uses the configured idle application at `CITY_APP_URL` (default port 6178), sends a real
Kujo task, and consumes provider usage. Evidence is in `evidence/interactive-observer`
and `evidence/live-checkin` respectively.

## Import agent profiles and inspect teams

Managed installations include a pinned `kujo-agents` catalog. Import it explicitly:

```sh
"$HOME/.local/share/agent-city/start.command" agents:import
```

No separate checkout or global npm is needed. Existing managed installations need
an update to receive the bundled catalog. Source checkouts can use
`npm run agents:import -- /path/to/kujo-agents` to import a trusted local catalog.

Use the same `CITY_PORT_OFFSET`/`CITY_RUNTIME_DIR` as the app you intend to configure.
Open **Mission Command → Agent profiles / teams**, refresh, filter a team, and
select a profile to inspect permission limits, required capabilities, tools,
workflows and source hashes. Import is atomic and private; raw AGENT.md/SKILL.md
contracts are not sent to the browser or a model. Content hashes identify the
imported files but do not authenticate their upstream origin. Import only trusted
source checkouts. Importing does not execute contract instructions.

In **Custom author / reviewer**, refresh imported profiles and select the author
and reviewer. Eligible profiles show **DRAFT_REVIEW_ONLY**: PROPOSE permission,
no unavailable required capabilities, and no agent-owned project execution
requests. User-supplied JavaScript function cases may run after handoff in the
separate disposable checker; that execution is observed as `city-function-checker`,
not attributed to the author or reviewer. No project files or source credentials
are exposed to that checker. Explicit local documentation retrieval/MCP reads are permitted only when
the author manifest allows **Kujo Docs**. The reviewer receives the resulting
evidence as context; it does not inherit the author's tool permissions. Other profiles remain **NOT_CONNECTED**. The current catalog has51
eligible profiles. This adapter executes the existing author→reviewer SDK handoff,
not the catalog's named workflows. Declared tools are not automatically granted.

For a Kujo mission, an imported author must also allow **Kujo Docs**, since this
mission explicitly reads the public Kujo MCP catalog. The corrected raw Kujo
artifact is saved as `reviewed.kujo` and syntax-checked; the UI identifies that
checked artifact. The original author draft and model review remain available.
Generated Kujo code is **not executed**. Built-in Kujo missions retain their
existing author-draft check and separate review behavior.

Custom reviewers return two explicit fields: the deliverable and their review
commentary. City saves only the deliverable as the output file; the conversation
shows both, labeled as actual model content. The original response and a private
review record remain available locally. Malformed/empty artifact responses fail
without guessing which text was intended. A review opinion never becomes an
executed check result.

Each mission privately snapshots both contracts. Continuations reuse those snapshots
even if the catalog changes. Two execution instances can share one profile; the
source-qualified execution IDs remain distinct. Imported role IDs reach the city
through actual lifecycle evidence. Profile selection alone creates no citizens.

Real profile execution and browser identity were verified. The small-model example
invented Go syntax; the cloud reviewer then hit its requested output limit. With
an explicit 8192-token limit, corrected documentation passed narrow content and
Kujo syntax checks. It still included extra review notes, so this is not general
model-quality qualification. All attempts remain recorded. See
[evidence and limits](evidence/profile-missions/README.md).

## Provider output limits and failures

**Model connection → Output token limit** accepts256–16384 tokens; the default
remains2048. It is a requested provider limit, not a guarantee or progress meter.
Higher limits may increase latency and provider charges; City never raises them
automatically. Save the connection, then explicitly continue/retry the task.

Select a failed mission to see bounded provider diagnostics: HTTP status, known
finish reason, returned content length and the requested limit. Diagnostics never
include prompt text, reasoning text, response content or credentials. Missing data
is UNKNOWN. A `length` finish reason fails the mission; partial final content is
retained privately in its recorded exchanges. Previous attempts are never replaced.
See [real recovery evidence](evidence/provider-limits/README.md).

### Execute selected project inputs

Selected project snapshots are model context by default. To let generated Kujo
read them during actual execution, explicitly enable **Copy selected project files
into this Workcell run** as well as **Execute checked Kujo code in Workcell**.
The copied files live under `project/<selected relative name>` next to `input.kujo`.
For example, a selected `prices.txt` is available as `project/prices.txt`.
This copies up to eight bounded text files; it does not mount your host project,
activate its workflows or grant network access. Repository internals and Git
control files are rejected. The inspector's Workcell evidence retains input
name/size/hash references. To return created or modified copies, list their relative paths under **Project
files to export** before submission (without the `project/` prefix). Only named
outputs are eligible; the returned text bundle is limited to eight files,16 KiB
each and32 KiB total. Inspect actual before/after hashes and content in Workcell
evidence, then **Save project file bundle**. This never applies changes to the
host. Exported contents are observed results, not an automatic correctness or
review verdict. Unavailable output content is shown separately from verified
execution. Stdout remains in inspection evidence; **Save reviewed artifact**
downloads the generated program itself.
Each continuation requires fresh execution and project-input consent.

VideoOps media integration: [Pixel v2 presets, your own product media, and optional ElevenLabs audio](docs/videoops-media.md). New provider calls require explicit scoped consent; every new video requires its own review. Included in 0.2.0; the earlier immutable rc.2 does not include it.
