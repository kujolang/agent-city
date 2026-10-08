# Real approved MCP source read

Business source: `f5c75f40a5f4d1d29c30634439a901e9dd518575`.
Run: `npx tsx scripts/mcp-source-live-proof.ts`.

`proof.json` records real Dispatch/SDK author and reviewer executions against
Ollama `glm-5.3:cloud`. A dedicated authenticated native Kujo MCP server actually
reads `docs/project-guide.md` from its restricted local workspace. The file states
that Lantern uses port7346 and that its workspace must be backed up before updates.
Both facts survive in the actual [reviewed artifact](reviewed.md). The task did not
supply those facts in the prompt. This is a real file read and model task, not a
synthetic lifecycle fixture or a claim that Lantern is a deployed application.

The SDK source read has its own operation/invocation identity and observed
start/success/result-code evidence. Raw source contents are absent from the spool.
The source-read server name is UNKNOWN; the separate README discovery identifies
mcp-demo. No server identity is inferred from a display name. Raw responses remain
private task context. An earlier successful run is retained in initial-proof.json;
its result-code omission was fixed before the final run. Neither run involved
Workcell, a new browser world traversal, or the queued useful-tool video.

Controlled proof in ../review-contract-fixture covers actual SDK execution with
synthetic HTTP replies: successful read, server-denied read, profile authorization,
no grant inheritance, no model call after a denied source read, and unapproved
model-selected tool refusal. Unit tests cover disabled operation, path bounds,
duplicates and credential/remote-endpoint refusal. Browser checks in
../../mission-workcell/browser cover explicit source names posted once and reset
on submission and continuation; UI submission was intercepted, not live work.

Local npm run verify passes110tests, types, boundaries, maps and build. Installation
CI status is retained alongside this document once completed. General approved
Ability/named-workflow execution, full visual/release acceptance and final video
remain unqualified. No eight-hour soak or sibling source changes were made.

CI [37736218850](https://github.com/kujolang/agent-city/actions/runs/37736218850)
passes all5jobs at the source revision above, including110tests and all four
installed platforms with the updated source-read/profile boundary proof.
