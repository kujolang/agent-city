# Real SDK Editor continuation

The Editor consumed checksum-revalidated immutable bundles from
`videoops-preparation-1791472748655`; no planning or asset-selection model calls
were repeated. The actual Kujo SDK invoked the existing Codex subscription
connector (`codex-cli-default`, underlying model UNKNOWN). Attempt 1 passed the
stage-owned artifact contract and render-input validation.

`proof.json` retains the SDK and artifact receipts. `render-input.json` contains
the exact generated composition; its HTML SHA-256 is
`8cf154d2a4d13633445fa8d9a76cdfe4baf87991a3f1662a45ef1c98e32794a3`.
`normalized.json` retains all 18 canonical-backed observations from preparation
and Editor work. The continuation passes upstream files directly; it does not
fabricate an SDK handoff event for that file transfer.

Three production-coordinator regression tests and TypeScript pass. Isolated CI
run 37801157457 at22b469b renders these exact bytes after checking every original
artifact hash and byte count. Its result is pending at this checkpoint.
No rendered output, perceptual approval, finalization, UI launch acceptance or
release readiness is inferred from Editor success.
