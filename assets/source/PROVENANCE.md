# Original Agent City assets

The maps, pixel glyphs, characters, facades and interiors were authored for
Kujo Agent City during this implementation. No screenshot, sprite, map, logo,
music, or image pixels from a protected game were copied or traced. The supplied
visual pack was unavailable during the initial placeholder pass; it was reattached
and inspected for the subsequent revisions described below.

Maps are editable finite orthogonal Tiled JSON (`*.tmj`, `city.tsj`); the initial
files were authored as JSON, not exported from a running Tiled editor. The map
compiler supports this narrow tile/object profile and rejects flip flags.
The renderer projects tile colors and original geometric props into Pixi.

Copyright 2026 Kujolang. MIT license, see repository LICENSE.

## Reference revision — 2026-09-08

The user reattached five Agent City concept images in thread
01a07eec-2aeb-7410-8945-01770bc25cff. They now guide the rooftop city,
industrial room materials, blue/black frames and left roster / central world /
right inspector layout. `research/visual-reference-manifest.json` records source
hashes and intended use. Images themselves and their protected character pixels
are not included in distributable assets. `renderer-pixi/scenery.ts` contains
original integer pixel drawing instructions, not extracted image data.

This is the first reference-led revision, not final visual fidelity approval.
This historical first pass preceded the multi-level rooms and character revision.

## Original character atlas — 2026-09-08

`characters.json` contains hand-authored pixel silhouettes for original canine
field engineers: ears/muzzle, protective goggles, boots, utility belts and
profile-specific caps/headsets/visors. No turtle bodies, protected sprite pixels,
weapons or logos were extracted. The role palette binds to stable appearance IDs;
execution badges remain distinct identity information.

`python3 scripts/compile-characters.py` deterministically builds the lossless
`assets/compiled/characters.png` atlas. Eight palettes, separate front/city and
side/interior views, fourteen semantic pose slots and four frame slots use a
280×1536 texture (1,720,320 decoded RGBA bytes; 23,712 PNG bytes). Some resting
poses intentionally share frames. Owning a talk/complete/offline asset does not
authorize its display: world-core still selects only evidence-supported poses.
Static DOM portraits share profile palettes/accessories and do not communicate status.

The city still needs more varied architecture and denser scenery to approach the
full supplied reference direction. These assets are an implementation revision,
not user approval of final visual fidelity.

Dedicated 32×32 canine bust portraits are authored in portraits.json and compiled
with `python3 scripts/compile-portraits.py`. Their 32×256 atlas uses 32,768 decoded
RGBA bytes (1,084 PNG bytes). Seven known profiles and the unknown fallback share
the world character palette IDs. No reference image pixels were sampled.

## Explicit imported-profile bindings — 2026-10-08

`profile-appearances.json` binds the five source-qualified profiles used in the
recorded code/Kujo/Publishing House proofs to existing original writer/coder/reviewer
palettes. No display-name matching, permission grants or role/activity inference
occurs. Unlisted profiles retain the explicit unknown fallback. Execution identity
and per-instance badges remain separate. This is presentation metadata only.

## Evaluation and tool-room fixtures — 2026-10-08

Original integer-coordinate Dojo instrument benches replace tall flat cards with
riveted bezels, timber ribs, wiring, drawers and woven floor borders. MCP equipment
uses six authored cabinet heights and wall ducts. These are passive fixtures;
existing observed outcome text is projected separately. No map, portal, station,
identity, runtime state or semantic scheduling changed. No reference-image pixels
were copied, and no decorative status/progress indicators were introduced.

## Architectural frame revision — 2026-10-08

All six interiors now share original riveted steel beam segments. The Meeting
Hall table carries a static printed architectural plan, not a live run/map or
invented communication. City plots have narrow evergreen margins and side-road
markings within existing authored geometry. A blue-framed area title and actual
execution count replace the loose title and fictional P1 HUD slot. These are
integer-coordinate instructions authored in scenery.ts/index.ts; no reference
pixels were sampled, copied or traced. Empty-world screenshots qualify layout
and style only, not source activity or user acceptance.
