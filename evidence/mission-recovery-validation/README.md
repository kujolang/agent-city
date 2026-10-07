# Mission receipt recovery validation

The previous runner reconciled failed receipts with `receipt.code !== 0`, which
accepted a missing exit code, strings and booleans as terminal failure evidence.
Recovery now requires matching identity/kind, valid source timestamps and explicit
coherent terminal status/code. Explicit null remains supported for the existing
writer's observed signal termination. Producer-clock rollback is not used to
invalidate an otherwise explicit outcome. Missing/incomplete/malformed evidence
stays UNKNOWN; no receipt is rewritten or operation re-executed.

Reads use a bounded1MiB buffer through one nonblocking, no-follow file handle, including a growth check. Symlink receipts are rejected.
Oversized and nonregular receipts are not terminal evidence. I/O availability
errors remain errors, rather than being converted into source success/failure.

Actual runner HTTP fixture: two stored running jobs restart as UNKNOWN. Missing
and boolean exit codes remain UNKNOWN and receipt bytes stay unchanged. The test
harness then supplies explicit failed1/completed0 receipts; the runner reconciles
both. This is a controlled corruption/restart fixture, not a live process-kill test.

The retained real mission-e58374b0-73ce-41b2-aab7-a46b9575081b completed receipt also
passes without mutation or re-execution. Proof in proof.json. Full verification
83tests/29files, boundaries/maps/typecheck/build passed; final clock-rollback case
and targeted recovery checks/typecheck passed. Source crash/orphan cleanup remains
outside this receipt validation qualification.
