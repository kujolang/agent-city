# Controlled author/reviewer and tool-boundary proof

Source: `7e172af58a61d44bb47380b30659345fda5d8d90`.
Command: `npx tsx scripts/profile-mission-proof.ts`.

`proof.json` records synthetic provider/MCP responses driven through the real
Dispatch and Agents SDK runtime. It is a boundary regression test, not a new live
model or real MCP product proof. Earlier live evidence remains separately stored.

Normal author/reviewer handoff, fenced review envelope, malformed review rejection,
profile-contract retention after catalog removal and documentation authorization
pass. Five additional missions fail explicitly for ungranted tool requests:

- Author text accompanied by a modern tool request.
- Reviewer tool request with no text.
- Legacy function request.
- Tool-call finish reason without an invocation body.
- Malformed tool-call declaration.

For each, the proof checks failure, no requested MCP execution, no final artifact,
no artifact-created or MCP lifecycle event, and the public diagnostics flag.
Argument canaries do not enter the diagnostic API or source spool. Existing
empty/null tool declarations remain compatible. Historical records without the
new field display UNKNOWN, not a fabricated absence of requested tools.

`npm run verify` passes 108 tests, types, package boundaries, maps and production
build. This change does not add model-selected tools or qualify broad workflow
execution, full visual fidelity, long-running reliability or final release.

CI [37735018189](https://github.com/kujolang/agent-city/actions/runs/37735018189)
passes all five jobs at the source commit above, including installation and the
controlled proof on Linux x64/ARM64 and macOS Intel/ARM64.

Source-read extension at f5c75f4: the current proof also performs an explicitly
granted read_text_range before drafting, rejects traversal before admission,
retains a server-denied source attempt without final artifact/model consumption,
and confirms grants do not survive continuation. Its synthetic MCP endpoint is
separate from the real source-read proof in ../source-reads-real. Historical CI
above qualified the earlier boundary-only implementation; current CI is recorded
with the real source-read evidence. Local verification now passes110tests.
