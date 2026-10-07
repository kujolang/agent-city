# Structured reviewer deliverable proof — 2026-10-07

Real mission-b1b3e43e-370c-42e1-b718-9f67dc0e8557 used glm-5.3:cloud through
local Ollama, an8192-token requested limit, real Kujo Dispatch/SDK, and the isolated
Kujo MCP demo's read_project_docs operation. Documentation Writer handed off to
Code Reviewer. The reviewer returned explicit cityArtifact/cityReview strings.
City saved only cityArtifact as reviewed.md and stored commentary privately in
reviewed.md.review.json. Original model exchange remains intact. Conversation
labels commentary as model assessment, never an executed check outcome.

[Deliverable](deliverable.md) and [inspection](quality.json) pass the specific
source/example/brief-Markdown requirements and exclude review commentary. This
supersedes the format failure of the preceding docs-real example for this tested
run, without altering its historical artifact. General model quality remains open.
No new gateway/browser traversal claim; this proof reaches the lifecycle spool.

The review-contract-fixture sibling uses synthetic provider/MCP responses with
real Dispatch/SDK. It proves exact extraction, preserved contracts across
continuation/catalog removal, and malformed output fails with an empty artifact,
retained original response and no artifact.created observation. No heading/fence
heuristic or automatic retry is used. No raw review text enters telemetry.

Full npm run verify:73tests/23files, types, boundaries, sevenmaps and build PASS.
Both proof processes terminated; no soak or sibling source changes. Initial
validation failed because Kujo has_key returns0/1 and cannot be negated with !;
explicit zero comparison repaired that compatibility error before acceptance.

Reproduce with scripts/profile-mission-proof.ts (controlled default). For the real
provider/MCP variant, use the environment documented in ../docs-real/README.md.
