# Reference acceptance — current local build

The supplied five-image pack is indexed, with hashes, in
[visual-reference-manifest.json](../../research/visual-reference-manifest.json).
Its original images are not distributable game assets. Current source uses original
pixel instructions and canine characters; it does not extract protected sprites.

This is a partial visual assessment, not final user approval or release readiness.
The new captures are an empty observer fixture: AG0 and UNKNOWN are intentional.
No synthetic workers are presented as product proof.

| Reference direction | Current evidence | Assessment |
| --- | --- | --- |
| Photo1: compact waterfront neighborhood, rooftops, paths and building signs | [City](city.png): six distinct facades, canals, authored thresholds, street markings, framed area title | Implemented at256×208; grid layout and roof/detail density remain simpler than the reference |
| Photo2: black/blue command-center framing, roster and selected-agent surfaces | [Whole page](whole-page.png): left roster, dominant central canvas, right truth inspector and blue framing | Default unconfigured layout captured; long task form below the world still needs a more compact presentation and a real selected-agent comparison |
| Photo3: industrial side-view architecture, utility framing, multiple levels | [Workshop](workshop.png), [Library](library.png): riveted steel borders, brick floors, authored upper stations/ladders | Implemented; original compact geometry, not a traced room |
| Photo4: framed briefing wall and shared meeting table | [Meeting](meeting.png): steel beams, lockers, pendant lights and printed plan | Passive scene fixtures implemented; no invented participants, dialogue or meetings |
| Photo5: dense knowledge shelves, desks, lamps and upper gallery | [Library](library.png): separate source stations, book bays, globe and reading tables | Implemented with fewer texture details than the higher-resolution concept |
| NES-era presentation | Native256×240 including32px HUD, nearest-neighbor integer scaling, limited palette, original small glyphs and sprites | Browser proof passes native/integer layout and keyboard fullscreen; GPU pixel identity is not claimed |
| Truthful HUD | Actual known execution count replaces decorative P1; source freshness remains separate | AG count includes known execution instances, not an invented active-worker or player count |

`npx tsx scripts/game-view-proof.ts` captures all seven scenes and verifies
unchanged truth, no write actions, keyboard fullscreen entry/exit, integer scale,
320px layout and usable DOM fallback when renderer initialization is rejected.
`npm run verify` passes110tests, boundaries, types, map validation and production
build. No map/portal/station route, semantic scheduling or runtime business behavior
changed. This run is not evidence of new live agent traversal or final tool video.

Still required for final visual acceptance: compact task/onboarding presentation,
whole-page comparison with real selected executions and actual communication, motion review across the
real task sequence, and resolution of the remaining density/fidelity differences.
The broader release checklist remains open.

Runtime/source revision c2aad743a997662473c6be54c2b033b1a18eaab7 passes all5jobs
in CI37737469181, including110tests and all4installed platforms. The follow-up
whole-page capture changes only the evidence harness, not application behavior.
The actual empty-state screenshot confirms the central world remains dominant,
but the long task form below it is a remaining command-center usability gap.
