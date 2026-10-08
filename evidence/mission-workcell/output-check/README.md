# Explicit Kujo output checks

Source b7ce05e / harness07f0467. CI37725760852 runs the installed application on
Linux x64 and ARM64. Both execute two actual Kujo programs in the pinned local
Workcell image through the Mission API, SDK author/reviewer handoff and MCP read.
Provider responses are controlled; this is a new feature qualification, not a
fresh live-model proof or the final usable-tool video.

First reviewed program subtracts instead of adding: static check succeeds, actual
stdout is `-1\n`, explicit expectation is `5\n`, output check FAILS. An explicit
follow-up receives the previous failed validation and produces corrected code.
Actual stdout is `5\n` and the output check PASSES. Original failed validation
remains unchanged. Both missions complete their source workflow; that status does
not imply functional correctness. Individual output-check lifecycle outcomes are
asserted in the bounded metadata spool; new browser travel is not claimed here.

Matching is exact except CRLF → LF. Truncated/unverified output is UNAVAILABLE.
The check requires explicit per-request Kujo execution consent; no generated code
runs on the host. Output stays in private artifact/context records, not lifecycle
metadata. The existing browser proof verifies keyboard consent, submitted newline
and reset after submission over retained real mission evidence; submission is
intercepted and runs no new source work.

`x64.json` and `arm.json` retain both attempts and actual validation results from
the uploaded installation artifacts. Full local verification passes99tests,
types, architectural boundaries, maps and build. Broad project access, arbitrary
named workflow execution, final visual fidelity and full release qualification
remain incomplete. No long soak was run or scheduled.
