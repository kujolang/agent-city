# VideoOps adapter foundation — not production acceptance

`apps/runner/videoops-artifacts.ts` provides bounded role-owned text bundles and
immutable per-stage attempt directories. It preserves exact bytes, hashes and
source-qualified execution references. Its receipt says **stored**, not validated
production, rendered or approved. Editor source storage does not execute HTML/JS.
Structural JSON parsing is not the upstream artifact-schema or creative gate.

`apps/runner/videoops-native.ts` invokes the canonical kujo-agents tools through
fixed offline inspection commands with bounded subprocess time/output and an
environment without inherited provider secrets. It does not authorize generation,
record approval, render or promote. Native tools initialize their private local
ledgers; this is not advertised as a read-only filesystem operation.

Actual local preflight: media doctor/providers observed; FFmpeg and ffprobe found.
Review status is unavailable because this fresh workspace has no submitted candidate.
No approval, entitlement, media-generation capability, model capability or production
readiness follows from installed tools. See native-preflight.json.

Verification: 124 tests, types, pure-world boundaries, maps and build pass.
New tests reject role/path crossing, oversized/missing/malformed outputs, symlinks,
duplicate attempts, unsupported native commands and timed-out tool observations.
An observed native BLOCKED review remains distinct from a tool that did not return
a usable receipt.

Still required: stage orchestration and model/capability admission, isolated actual
HyperFrames rendering, exact-candidate technical/perceptual review, City UI and real
production acceptance. Existing rc.2 and the unavailable VideoOps catalog status are
unchanged. No sibling repository changes or long soak were needed for this work.
