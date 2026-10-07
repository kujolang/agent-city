# Imported profile execution — 2026-10-07

Implemented: explicit author/reviewer selection from imported contracts, PROPOSE
permission checks, fail-closed required capabilities, private per-run contract
snapshots, continuation snapshot retention, source-qualified profile telemetry
and readable profile names in recorded conversation/history. The current catalog
has51 draft/review-eligible profiles and34 requiring unavailable capabilities or
permissions. Execution instances remain distinct even when sharing a profile.

The current adapter runs writing/JavaScript drafts and review only. It does not
execute catalog workflows, declared tools, project changes, publishing or imported
skills as commands. Required tool/retrieval/check requests are rejected rather
than silently downgraded. Full ecosystem execution remains incomplete.

## Evidence

- `fixture/proof.json`: controlled model, actual SDK/Dispatch; author/reviewer role
  contracts reached the respective requests; unsupported profile/tool requests400;
  continuation retained exact contracts after removing the catalog.
- `real/proof.json`: actual local Ollama qwen2.5-coder:1.5b-instruct, Documentation
  Writer→Code Reviewer, actual handoff and saved output. Runtime completed, but
  reviewed content incorrectly translated supplied syntax into Go and added APIs.
- `real/browser.json` / `browser.png`: retained real source observations flowed
  through Watchdog/gateway into browser truth with the selected profile identities;
  renderer initialized and capability-ineligible selection was disabled. This is
  retained evidence delivery, not a claim of live animation timing or task quality.
- `real/repair-failure.json`: corrective continuation via Ollama glm-5.3:cloud
  failed in reviewer handoff. Exact provider cause is UNKNOWN. Both original and
  failed attempts remain, representing four real execution instances in truth.

Full verify69tests/22files, types/maps/boundaries/build passed. The baseline
SDK/Dispatch/RAG/MCP mission-contract proof also passed after these changes. Real task-quality
acceptance remains FAIL. No producer repositories changed. No long soak performed.
Reproduce fixtures with `node --import tsx scripts/profile-mission-proof.ts`;
set CITY_PROFILE_PROOF_REAL=1 for an explicit real local-model run. Browser proof
uses CITY_BROWSER_URL and optional CHROMIUM_PATH. Private prompts/contracts/output
remain in the runtime paths identified by the receipts; they are not SSE telemetry.
