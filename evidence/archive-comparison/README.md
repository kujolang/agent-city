# Archive comparison

The Archive now fetches and validates both selected runs, rather than showing
one timeline alongside a second run summary. Each panel shows recorded execution
status, individual operation attempts, metadata and links to the gateway evidence
resolver. The detailed output includes both timelines, artifact references,
checksums, versions and completeness. This is read-only inspection; only the
explicit replay button changes presentation mode.

`npx tsx scripts/archive-comparison-proof.ts` passed against current Journal
exports of retained real Phase 1 observations. The test routes browser transport
to those exports; it does not claim a new live execution or production gateway
authorization test. It verifies:

- Both displayed timelines exactly match their independently validated bundles.
- Eval failed, skipped and later successful attempts remain inspectable.
- Evidence links are present for every event; all API requests are GET.
- Keyboard activation and 320 px layout work without horizontal overflow.
- A corrupted comparison checksum prevents either panel from being displayed.
- Comparison does not invoke replay; explicit replay and return-to-live do.
- No browser errors occurred. Typecheck and production build passed.

Screenshots: `comparison.png` and `comparison-320.png`. `proof.json` contains the
source run IDs and request evidence. This standalone DOM test intentionally does
not instantiate Pixi, demonstrating that the Archive does not depend on rendering.

The first narrow-layout test failed because its fixture omitted the production
`archive-body` wrapper and therefore the existing select sizing rule. After
correcting the fixture, measured overflow was empty (`layout.json`). The initial
bounds remain in `harness-layout-before.json`. Reviewed manual CaseFile:
`.casefile/2026-09-08-163656-archivecomparisonharnesslayout`.

This closes the missing second-run inspection behavior, not the outstanding
writing quality, visual fidelity, full-path throughput or hidden-tab gates.
