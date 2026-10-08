# VideoOps preparation gates and handoff

Implementation checkpoint, not live production qualification.

Planning → bounded repair → validated file handoff → Asset Scout now runs through
the SDK stage adapter. Capability admission occurs for both roles before spending.
Every attempt, private intake, structural gate and exact source-qualified handoff
is retained. Two economical attempts are permitted for deterministic output/gate
failures; an uncertain provider execution does not authorize another call.

The gates use byte-identical upstream shot-list, asset-manifest and handoff schemas
from the installer-pinned kujo-agents commit. Source/hash provenance is in
apps/runner/videoops-contracts/provenance.json. No synthetic creative scores or
legacy fixture approval is used.

Additional checks enforce frame-aligned requested duration, continuous coverage,
explicit overlapping transitions, unique identities and reciprocal shot/requirement
references. Resolved assets need matching hashes/paths and rights evidence from the
trusted acquisition adapter. Scout JSON alone cannot approve an asset.
GENERATE and BLOCKED remain explicit routes. The caller must supply verified
acquisition facts; the preparation runner does not itself acquire or inspect media.

Tests cover invalid timing, missing references, forged asset claims, missing
handoff artifacts, changed role identity, preservation of a failed plan and repaired
attempt, actual handoff metadata and no retry after an uncertain provider result.
Orchestration tests inject an explicit fixture stage executor; they are not real
model proof. The separate SDK fixture proof remains in videoops-stage-contract.

Current output ready-for-editor means structural/acquisition readiness only.
Creative quality, isolated HyperFrames rendering, independent exact-candidate
perceptual review, UI, live acceptance and a new release are still required.
