# Agent City 0.2.0 release evidence

[Published final release](https://github.com/kujolang/agent-city/releases/tag/v0.2.0)
is GitHub's latest release, not a prerelease. Annotated tag source:
`40cd162d20e6d29b2f210c75f379234bee51f5f2`.

[Publication receipt](publication.json) records the public release, all four anonymous
asset download/hash checks, matching manifest/tag, and ShipCheck results.
[CI 37830351419](https://github.com/kujolang/agent-city/actions/runs/37830351419)
passed all five jobs: build/browser/dependency checks and macOS Intel/ARM,
Linux x64/ARM installed acceptance. Local TypeScript checking passed.
ShipCheck `gate --dir . --format json` in Agent City exited0: gate passed13/16,
zero errors, three warnings (lint command, optional Kennel metadata/Kujo entrypoint).
Its scope is metadata, not runtime certification.

Runtime directories apps/packages/integrations/assets have no diff from rc.3.
The [approved real production](../videoops-media-integration/README.md) remains
valid without executing another model or provider request. Existing release
candidate tags/assets remain immutable.

Supported scope is the documented local workflows. The hardening assessment stays
CONDITIONAL for unqualified long-duration behavior; the user-excluded eight-hour
soak was not run. Model accounts, optional audio entitlement and compatible
Workcell isolation remain prerequisites. No extra local fresh-install success is
claimed; installation qualification comes from the four isolated CI platforms.
