# Public immutable preview release

Published v0.2.0-rc.2 at source6d550705bf5e2ede6c80838d93d7877dc6b2ef98:
https://github.com/kujolang/agent-city/releases/tag/v0.2.0-rc.2

GitHub release406832650 is public, prerelease=true, draft=false, immutable=true.
The annotated tag points to the qualified source commit. Four assets uploaded with
matching SHA-256 digests, then each downloaded anonymously and matched again:
pinned install.sh, source tar.gz, release-manifest.json and SHA256SUMS. The manifest
pins application/runtime/producer revisions and four supported platform variants.
This is a network installer/source distribution, not an offline binary bundle.

The exact release installer passed in a new local directory with --no-start. Its
receipt pins the release commit and its doctor reports ok=true. CI37780321588 for
the same source passes all5jobs, including four installed platforms,115tests,
architectural boundaries, maps/build and native browser discard recovery. Local
ShipCheck scan and gate on agent-city exited0,13/16,0errors,3warnings (lint command,
optional Kennel manifest and Kujo entrypoint); metadata readiness is not certification.

The local verification briefly hit a host no-space-left-on-device error while
writing the doctor log. Only stopped test browser profiles and the verified
throwaway installation were removed; receipts were retained. Doctor then passed.
Host free space remains low/fluctuating and no unrelated data or service was touched.
All release assets and public downloads were verified afterward.

Release scope is the supported local preview. WebOps/VideoOps executable adapters
remain open; publishing the preview does not close that separate workstream or
claim universal production readiness. No eight-hour soak ran or was scheduled.
