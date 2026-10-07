# Custom profile documentation read — 2026-10-07

Real operation proof: mission-c5428ca5-d9b1-4e0c-a2a7-a4b2d769adb3 used
Ollama's `glm-5.3:cloud` (cloud inference, local provider endpoint), explicit8192
output limit, real Dispatch/SDK and an isolated copy of the existing Kujo MCP
server. The real read_project_docs invocation read its demo/docs/README.md.
Documentation Writer's manifest allows Kujo Docs; Code Reviewer received the
result as evidence, without acquiring tool invocation permission.

The mission completed and retained14 lifecycle observations including MCP start,
successful completion, distinct author/reviewer identities and actual handoff.
Proof.json records metadata and output hash. This run ends at the local lifecycle
spool; no fresh gateway/browser traversal is claimed here. It used no synthetic
provider/tool response. The separate docs-fixture run controls both responses to
assert the context reaches both roles and raw text never reaches the spool.

Authorization: explicit request flag AND exact author manifest tool permission.
Required capability and PROPOSE checks remain mandatory. Unsupported author reads
returnHTTP400; a reviewer's permission cannot authorize the author. Kujo execution,
function checks, arbitrary tools, project writes and named workflows remain blocked
for imported profiles. Documentation reads are the existing fixed read-only adapters.

Output inspection: the corrected draft accurately shows add(a,b) returning its
sum and add(2,3)→5, and acknowledges the fetched README is unrelated. The reviewer
still adds findings/summary around the draft, so whole-artifact draft-only format
is NOT accepted. No broad model-quality claim. Historical failure attempts remain.

Verification: npm run verify passed73tests/23files, typecheck, boundaries, seven
map validations and production build. Controlled proof additionally verifies
snapshot continuation after catalog removal. The real proof's MCP and runner
processes exited and were cleaned up. No long soak or sibling source edits.

Reproduce using an owned authenticated MCP server:
```sh
CITY_PROFILE_PROOF_REAL=1 CITY_PROFILE_PROOF_MODEL=glm-5.3:cloud \
CITY_MAX_OUTPUT_TOKENS=8192 CITY_PROFILE_PROOF_MCP_URL=http://127.0.0.1:PORT/mcp/v1 \
CITY_PROFILE_PROOF_MCP_TOKEN=YOUR_LOCAL_TOKEN npx tsx scripts/profile-mission-proof.ts
```
Use the normal local stack's MCP endpoint/token or prepare an isolated server with
scripts/prepare-mcp-proof.ts. Keep credentials private. Without REAL=1 the script
uses explicitly synthetic provider/MCP responses and must not be cited as real AI.
