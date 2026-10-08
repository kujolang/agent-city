# WebOps browser contract

Run: `npx tsx scripts/webops-browser-proof.ts`.

This is an explicit controlled browser/API fixture, not product proof or a model
run. It mounts the production Mission Command UI and verifies explicit workflow
selection, disabled unrelated grants, malformed JSON rejection without submission,
the exact evidence-bearing writing request, and readable/downloadable failed
report results. No source work or model request occurs.

The companion unit tests cover malformed evidence, invented source references,
unsupported action/measurement claims, unknown historical outcomes, exact reporter
identity, required capabilities and JSON download bytes. Real provider acceptance
is still required before this workflow is advertised as qualified.
