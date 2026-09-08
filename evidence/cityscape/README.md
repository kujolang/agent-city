# Cityscape and real Dojo history rendering

Run `npx tsx scripts/cityscape-proof.ts` from Agent City. It starts an isolated
local Vite server and replays retained real truth into the actual Pixi renderer.
It never calls a model or executes a source operation.

`proof.json` identifies the two real-model cohorts used. The first code attempt
failed its checks; the subsequent model repair passed. Pixel extraction verifies
both FAIL and PASS glyphs on the semantic content station, including operation IDs
that are not literal station names. A separate empty-snapshot negative control
with the same numeric order verifies old results cannot survive a replay reset.

`city.png`, `dispatch.png` and `meeting.png` show original scenery at the unchanged
256×240 logical resolution. Empty chairs/equipment are scenery, not invented agents
or task activity. Full DOM UI screenshots and accessibility checks remain in
`../visual-revision`. No final reference-fidelity approval or release claim.

Workshop pass (2026-09-08): `workshop.png` shows original conduit, bracketed
Workcell bay, static safety paint, lockers, component drawers, pegboards and rolling
tool storage. These are renderer-only fixtures behind existing stations/agents;
no map, route, portal, operation, or status logic changed. `mcp.png` also records
the existing MCP room for comparison. TypeScript and the Pixi browser proof passed;
Workshop screenshot inspected for readable station labels and unobstructed ladder.
The retained real Dojo FAIL/PASS checks and empty-snapshot negative control still
pass. This art pass does not establish final reference fidelity.
