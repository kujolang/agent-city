# rc.3 release review evidence

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
