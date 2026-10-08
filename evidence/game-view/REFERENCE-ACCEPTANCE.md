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
| Photo2: black/blue command-center framing, roster and selected-agent surfaces | [Whole page](whole-page.png): left roster, dominant central canvas, right truth inspector and blue framing | Default task composer now measures291px with optional tools grouped; real selected-agent/communication comparison remains |
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

Still required for final visual acceptance: whole-page comparison with real
selected executions and actual communication, motion review across the
real task sequence, and resolution of the remaining density/fidelity differences.
The broader release checklist remains open.

Runtime/source revision c2aad743a997662473c6be54c2b033b1a18eaab7 passes all5jobs
in CI37737469181, including110tests and all4installed platforms. The follow-up
whole-page capture changes only the evidence harness, not application behavior.
The actual empty-state screenshot confirms the central world remains dominant,
but the long task form below it is a remaining command-center usability gap.

Task composer qualification at af34958: the prompt and custom reviewer choice stay
visible; optional files/tools/execution/checks use a keyboard-accessible disclosure
with selected-option count. Default form height is291.375px at1280px viewport.
Source/Workcell grants remain explicit, survive closing the disclosure for
submission, and reset after submission/follow-up; retained JavaScript contracts
are deliberately exposed on continuation. This supersedes the long-form gap
above, not the remaining real-execution/reference fidelity qualification.

Local verify110tests, consent browser checks, keyboard Workcell setup and final
seven-scene/layout/fallback proof pass. An earlier visual proof was interrupted
by map regeneration triggering Vite HMR during concurrent verification; retained
CaseFile2026-10-08-023820-compactuivisualhmr. Run map/build verification before
browser evidence capture. No live model execution was needed for this UI change.

CI37739021708 ataf34958 passes all5jobs. Follow-up8484169 modernizes the old
continuation browser harness to use the existing browser locator and current
keyboard field order, explicitly checks visibility of the retained contract,
and adds that proof to CI. CI37739543368 passes all5jobs including that expanded
browser gate. Local source-grant/Workcell-consent and setup proofs also pass.
