# Try Agent City locally

This is a working local prototype, not a production release or a finished visual
match to the supplied references. The current character art and city density are
substantially simpler. The app runs real missions and observes their activity;
it does not yet provide free-form agent chat or player-controlled characters.

## Start

Open `Start Agent City.command` in this directory, or run:

```sh
cd /Users/robertdevore/2026/Kujolang/kujo-repos/agent-city
npm start
```

Open http://127.0.0.1:5178 and keep the terminal open. Stop with Ctrl+C.
If the launcher reports port 5178 occupied, stop the previous launcher first;
it deliberately does not kill existing processes. This checkout requires Node 24,
installed npm dependencies, and the existing sibling Kujo repositories/binary.
It is not yet a self-contained application download.

## Connect a model

Expand **Mission Command → Model connection**. This machine has a saved local
Ollama connection: endpoint `http://127.0.0.1:11434/v1/chat/completions`, model
`qwen2.5-coder:1.5b-instruct`, blank API key. Ollama must be running. Alternatively
enter your compatible provider's full chat-completions endpoint, model and key.
Saving configuration does not prove connectivity; a mission does.

Writer/coder and reviewer profiles are built in. Their execution instances appear
when actual work is observed. You do not need to create them manually, and the
roster does not imply a team is running continuously. One mission runs at a time.

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

Choose **Code + review**, and submit:

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
