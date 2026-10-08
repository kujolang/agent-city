# Try Agent City locally

This is a working local prototype, not a production release or a finished visual
match to the supplied references. The current character art and city density are
substantially simpler. The app runs real missions and observes their activity;
it does not yet provide free-form agent chat or player-controlled characters.

## Start

Install the public preview using [the bootstrap instructions](installer/README.md).
Then run the managed launcher (it supplies its private Node/npm):

```sh
"$HOME/.local/share/agent-city/start.command"
```

Open http://127.0.0.1:5178 and keep the terminal open. Stop with Ctrl+C.
If the launcher reports port 5178 occupied, stop the previous launcher first;
it deliberately does not kill existing processes. The managed installer supplies
application dependencies and the pinned Kujo producer/runtime sources. A model
provider and optional container engine remain separate prerequisites.

## Connect a model

If you do not have a provider yet, choose one:

- **Ollama:** follow the [official quickstart](https://docs.ollama.com/quickstart),
  open Ollama, and choose a local model or sign in there for a cloud model.
- **Codex:** follow the [CLI setup](https://learn.chatgpt.com/docs/codex/cli), run
  `codex login`, and complete the browser sign-in. Run `codex login status` to
  check your authentication method. Account access and usage limits remain
  provider-owned; see [authentication help](https://learn.chatgpt.com/docs/auth).

For Codex, leave Agent City running and start its connector in a second terminal:

```sh
CITY_APP_URL=http://127.0.0.1:5178 "$HOME/.local/share/agent-city/start.command" provider:codex
```

Use your actual displayed app URL if it differs. Keep that terminal open; it
configures the connection automatically. Wait for the MODEL status in Agent City
to update, then submit your task. Do not paste a subscription password or sign-in
token into the model form. The connector is a local text provider; it does not
import Codex's tools or projects.

Expand **Mission Command → Model connection**. No credentials or model connection
are bundled. With Ollama running and a model installed, choose **Detect local
Ollama**, select your model, then **Save connection**. A local Ollama endpoint
normally uses a blank API key; nothing needs to be saved elsewhere first. For a
compatible remote provider, enter its full chat-completions endpoint, model and
required key. **Check model listing** checks discovery; an actual mission checks
generation. Codex CLI login uses the separate adapter documented in README.md.

For a failed model call, inspect **Provider response diagnostics** in its mission
history. `finish length` means the output budget was exhausted; choose a larger
**Output token limit** explicitly before retrying. A slower model may need a larger
**Provider timeout (seconds)**, bounded10–300seconds per response (default90).
These settings do not guarantee a valid result. HTTP errors may require checking
provider access or selecting another model; being listed by Ollama is insufficient.
Failed attempts remain in history, and Agent City never switches models automatically.

Writer/coder and reviewer profiles are built in. Their execution instances appear
when actual work is observed. You do not need to create them manually, and the
roster does not imply a team is running continuously. The controller supervises
one admitted mission at a time. Explicit UNKNOWN queue recovery, described below,
can allow new work while an earlier unsupervised run remains unresolved.

For optional custom teams, the managed preview includes the pinned Kujo catalog:

```sh
"$HOME/.local/share/agent-city/start.command" agents:import
```

Use the same instance environment as your launcher. Refresh **Agent profiles /
teams**, then **Custom author / reviewer**. Choose eligible author/reviewer roles;
unsupported capabilities remain disabled. Importing profiles does not run agents,
install their external tools, or grant their declared permissions.

## First writing task

Choose **Writing + review**, leave retrieval options unchecked, and submit:

> Turn these supplied facts into a 60-word product introduction: Agent City is
> a local application. It visualizes observed agent activity. It separates current
> truth from animation. Add no features or factual claims beyond these three facts.

Select the writer in the roster and choose **Follow**. Inspect the actual draft,
reviewer response and final output in mission history. Without a real retrieval
or tool call, a Library/MCP trip should not occur. Enable indexed local Kujo docs
for a separate source-backed task to see retrieval travel. Review writing for
accuracy: the small local model has previously added unsupported claims.

## First coding task

Choose **JavaScript + review**, and submit:

> Return only an ES module exporting function sum(numbers). Return the sum of
> an array of finite numbers; return 0 for an empty array. Throw TypeError for
> any non-number element. Use a named export, not CommonJS.

Expand **Optional JavaScript function checks** and paste:

```json
{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0},{"name":"addition","args":[[2,3,-1]],"equals":4},{"name":"reject text","args":[[1,"2"]],"throws":"TypeError"}]}
```

These explicit cases execute the generated module in isolated Chromium workers,
with no host filesystem/network integrations. Without cases, code receives a syntax
check only. Runtime completion and check results are separate; failed attempts
remain in history. This does not execute an arbitrary repository or full application.

## Continue or repair an existing result

In mission history, choose **Continue / repair** beside a completed or failed run.
Enter the change you want, then press **Start mission**. The previous task, latest
completed output (if available), and recorded check results are included privately
in the new model request. The original task remains available through subsequent
revisions, without recursively copying the entire conversation into every turn.

Existing function cases are loaded into the visible check form; review or edit
them before submitting. Previous RAG/MCP options are cleared, so another retrieval
requires selecting it again. **Cancel follow-up** returns to a blank new mission.

Each follow-up creates new writer/coder and reviewer execution instances. History
shows its parent run and retains the old attempt. This is continued work with
recorded context, not a claim that a completed worker remained alive. Unknown or
unfinished source work must resolve before a follow-up can start.

## What to expect

City overview is the default. Follow tracks one execution through evidence-backed
travel and room transitions. Current truth updates immediately; an animation may
show RECENT after the operation has completed. Building buttons inspect rooms;
Pause affects visual motion only. Recorded model responses are actual output,
not ambient dialogue. No eight-hour test is required to try the app.

Current screenshots: `evidence/visual-revision/city.png` and
`evidence/live-missions/live-1788876751607-/writing-6.png`.
Remaining work and release limitations: `WORKING-EXPERIENCE.md`.

## Startup troubleshooting

Run `npm run doctor` (or `npm run doctor -- --json`) before starting to list
missing dependencies and occupied service ports together. It does not run a
model, change provider settings or stop other processes. A running Agent City
will intentionally report its ports occupied; this is a check for starting a
new launcher, not a verdict that an existing app is unhealthy.

The launcher uses ports 5178 (web), 8791 (RAG), 7791 (Watchdog), 7792 (gateway),
7793 (missions), and 8931 (MCP). It may reuse a responding local MCP health
endpoint; tool authorization is still checked on an explicit invocation.
`KUJO_BIN` accepts an executable path or a command available on PATH.

This machine is running many other applications, as reported by the user.
Short timing samples under that load are not isolated application capacity
measurements. Functional correctness, missing events and failed source operations
remain separate checks; a busy machine does not turn a failed operation into success.

## Run a separate local instance

If default ports belong to another running copy, use a complete port offset:

```sh
CITY_PORT_OFFSET=30000 npm start
```

Open http://127.0.0.1:35178. All six service ports move together. This instance
uses `.runtime/instances/30000` for its index, telemetry, model settings and
mission history, so it does not reuse the default instance's private state.
Configure its model separately in Mission Command. Ctrl+C stops its launcher.
The same offset must be used with `npm run doctor` when checking that instance.
Offsets must be integers from 0 to 56604; no occupied process is killed or reused
for an offset instance. Choose a free range; ports are checked before launch.

For a larger game view, choose **Fullscreen game** below the canvas. Use **Exit
fullscreen** or the browser's Escape control to return to the full inspector and
mission setup. Navigation, observed conversation and recording remain with the
world. The canvas recording still contains only game pixels, not the DOM panels.

## If interrupted work stays UNKNOWN

Agent City first looks for an actual completion/process receipt. If none is available,
mission history offers **Release queue / keep UNKNOWN**. Use it only when you want
to allow new tasks despite the unresolved earlier run; that work may still be running.
The confirmation records your admission decision, leaves UNKNOWN intact, and neither
stops nor reruns the old task. New work could overlap with it. A currently supervised
mission cannot be bypassed. Workcell cleanup remains a separate recovery operation.

### Check Kujo output and request a repair

After enabling Workcell and opting into execution for a Kujo task, open **Optional
Kujo output check**, enable **Check exact stdout**, and enter the output you expect.
For a program that prints `5`, enter `5` followed by a newline. Matching is exact
except that Windows CRLF line endings become LF. Blank expected output is allowed
when the checkbox is enabled. No check runs unless execution is explicitly enabled.

Open the finished artifact to see **KUJO OUTPUT CHECK: PASSED / FAILED / UNAVAILABLE**.
Completion of the agent task or container does not imply the check passed. Missing
or truncated output is unavailable, not a guessed result. Use Follow up to request
a repair; the next agents receive the prior validation and output. Enable execution
and the output check again for that request. Both attempts remain in history.

### Give the agents selected project context

Open **Selected project files** in Mission Command and choose the text files that
explain your task: for example an existing function and its requirements. The
selected content goes to the configured model for both author and reviewer. Limits
are eight UTF-8 files,16 KiB per file and32 KiB total. Files are private mission
snapshots with content hashes, not live links to your project. Mission inspection
shows the names and hashes; raw file contents are excluded from telemetry.

Ask for a corrected function or document, then review the saved output and explicit
checks. Your original files are not edited or mounted into Workcell. Follow-ups
retain the prior snapshot unless you choose replacements. Start a new mission to
begin with separate context. Attaching files does not fabricate retrieval activity;
use the explicit documentation options for connected documentation operations.

JavaScript checking requires a working Chromium sandbox. If its private diagnostic
reports **No usable sandbox** on Ubuntu24.04+, configure a per-executable AppArmor
profile for your installed browser or select a supported system browser through
`CHROMIUM_PATH`. Agent City does not disable the browser sandbox or alter your OS
policy automatically. See [Ubuntu's documented per-application user namespace
policy](https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890/1).
An unavailable checker is recorded as UNKNOWN execution, not a failed test.
