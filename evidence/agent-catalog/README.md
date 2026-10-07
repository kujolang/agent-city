# Agent profile catalog evidence

2026-10-07: imported all85 entries in the real local kujo-agents registry across
Chain of Command, Publishing House, VideoOps and WebOps. Preserved original
AGENT.md/SKILL.md/manifest contracts privately with SHA-256 hashes, source-qualified
profile IDs and distinct declared permissions/capabilities/tools/workflows.
The catalog is an explicit local-source import, not authenticated upstream code.

The real browser proof verified85 unique profile IDs, four team filters, actual
Code Reviewer contract display, no raw contract text in the response and eligible bindings marked DRAFT_REVIEW_ONLY and unavailable bindings marked NOT_CONNECTED. Screenshot: catalog.png.
Import creates no semantic execution, model request, tool invocation or citizen.

Full verify:67tests/21files, types, boundaries, maps and build passed. Final bounded
storage/temp-file cleanup changes passed focused catalog tests and typecheck.
Negative tests cover duplicate/mismatched identities and symlink escape. Reproduce:

```sh
CITY_PORT_OFFSET=4000 npm run agents:import -- ../kujo-agents
CITY_PORT_OFFSET=4000 npm start
CITY_BROWSER_URL=http://127.0.0.1:9178 node --import tsx scripts/agent-catalog-proof.ts
```

Set CHROMIUM_PATH when required. This run used installed Google Chrome. The test
stack was stopped afterward. Broader authorized capability execution
and named custom team workflows remain open; this is not completion evidence
for the complete custom-agent checklist item.

Follow-up: current browser receipt reports51 PROPOSE draft-review profiles. See
../profile-missions/README.md for actual execution evidence and failed quality gates.
