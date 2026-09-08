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

## What to expect

City overview is the default. Follow tracks one execution through evidence-backed
travel and room transitions. Current truth updates immediately; an animation may
show RECENT after the operation has completed. Building buttons inspect rooms;
Pause affects visual motion only. Recorded model responses are actual output,
not ambient dialogue. No eight-hour test is required to try the app.

Current screenshots: `evidence/visual-revision/city.png` and
`evidence/live-missions/live-1788876751607-/writing-6.png`.
Remaining work and release limitations: `WORKING-EXPERIENCE.md`.
