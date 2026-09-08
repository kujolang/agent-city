# Artifact execution coverage — 2026-09-08

A completed code mission with no validation receipt previously returned `codeExecuted: false`, causing the existing UI to claim CODE NOT EXECUTED. A receipt without that property could omit it from the response with the same misleading display. Missing evidence does not establish non-execution.

The actual artifact endpoint now returns a boolean only for an explicit boolean receipt field; otherwise it returns null. The existing UI maps null to EXECUTION COVERAGE UNKNOWN. Syntax or completed runtime status is not used to infer execution.

`scripts/artifact-coverage-proof.ts` starts an isolated runner with five synthetic historical receipt cases and requests its real GET artifact endpoint. Missing receipt, missing flag and string-valued flag return null; explicit false/true remain false/true. No model, mission command, or generated artifact executes. Typecheck passed. Proof is in proof.json. Existing real mission history is untouched.
