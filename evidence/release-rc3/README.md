# rc.3 published local-preview evidence

[v0.2.0-rc.3](https://github.com/kujolang/agent-city/releases/tag/v0.2.0-rc.3)
was published on 2026-10-08 at annotated tag source
`f39384e9377868a2772283f1439b7686dae31ec3`.
[Publication receipt](publication.json) records all five successful jobs from
[CI 37828518588](https://github.com/kujolang/agent-city/actions/runs/37828518588),
four anonymous asset downloads, matching SHA-256/manifest and tag identity.
macOS Intel/ARM and Linux x64/ARM installations include the local workflow guides.

The [new pixel media video](../videoops-media-integration/README.md) is approved,
finalized and downloaded byte-identically. The older silent candidate below
remains historical and was not approved in its place. No production was rerun.

The additional local installation failed with ENOSPC while downloading a producer;
CaseFile `2026-10-08-150221-rc3localinstallspace` retains the log. Its launch test
was not run. This environment failure is separate from the successful isolated
CI installations. No unrelated files were deleted and the user's app stayed running.

This is a conditional local preview, not unrestricted production certification.
Model accounts and optional audio entitlement are user-owned; no eight-hour soak.

## Historical draft checkpoint (superseded by publication above)


Code: `5e6c973e5278acd64e6698daa1a202e14cb2521d`.
CI: https://github.com/kujolang/agent-city/actions/runs/37817515504 — all five jobs
PASS. Downloaded four-platform installation/browser/Workcell receipts are in the
run directory. `ci.json` / `ci-jobs.json` retain exact source and job outcomes.
ShipCheck gate passes13/16, zero errors, three warnings (lint command and optional
Kujo manifest/entrypoint). Its scope is metadata only.

`asset-checks.json` binds the four draft assets to local SHA-256 and GitHub digest
where supplied. Draft release407093359 is NOT published. Public downloads and
immutable tag verification remain pending. Never replace the published rc.2 assets.

The [real VideoOps candidate](../videoops-combined-live/attempt-5/proof.json) has
technical PASS and requires explicit human visual review of the whole video before
finalization. No model rendering work is still running. The acceptance app remains
at http://127.0.0.1:27178 for review; model connector is idle.

This is conditional local-preview readiness, not unrestricted production or full
Kujo workflow support. Audio generation in the separate approved promo does not
establish that capability in Mission Command. The eight-hour soak was cancelled.
