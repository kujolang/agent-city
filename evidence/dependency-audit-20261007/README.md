# Locked dependency audit

Updated fast-uri 3.1.7 → 3.1.8 and source-map-js 1.2.1 → 1.2.2 within
existing dependency ranges. No top-level versions or producer sources changed.

Before: one moderate and one high registry advisory. After: zero registry-reported
vulnerabilities across the installed production/development dependency tree.
`npm run verify` passes types, boundaries, maps, all 97 tests and production build.
Original and resulting npm JSON reports are retained beside this file.

CI now checks moderate-or-higher advisories and retains the report even on failure.
This is a point-in-time dependency audit, not proof of exploitability, absence of
application vulnerabilities, or qualification of optional sibling cloud adapters.
