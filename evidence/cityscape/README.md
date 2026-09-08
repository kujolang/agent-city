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
