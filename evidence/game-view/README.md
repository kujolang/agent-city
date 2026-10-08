# Game-focused presentation

Actual Pixi/WebGL captures at3× integer scale (768×720), including the256×208world
and32pixel HUD. These are controlled empty scenes, not real runtime activity:
UNKNOWN/NO SOURCE labels and no invented citizens are intentional.

The optional Fullscreen game control keeps the world, navigation, conversation and
playback in the browser fullscreen element. Keyboard Enter enters/exits; native
fullscreen exit restores the DOM inspector. Denied fullscreen produces an actionable
message and leaves the normal UI usable. No runtime commands or truth mutations occur.
The proof also checks320px overflow, integer sizing and full canvas visibility.

Reference comparison (research/visual-reference-manifest.json):

| Reference | Current implementation | Remaining fidelity limits |
| --- | --- | --- |
| City | Six distinct original rooftop facades, blue water, masonry, road markings, black HUD | Much smaller neighborhood and simpler geography/material texture |
| Agent HQ UI | Blue framed roster/world/inspector, observed dialogue panels, original portraits | No free-form fictional chat, no copied character portraits; task controls are DOM |
| Building interior | Authored two-level Workshop/Library, ladder openings, industrial beams, shelves and utilities | Less shading/detail; no physics/player movement |
| Meeting | Original briefing table/chairs, steel fixtures, side-view context/evidence stations | Empty seats until actual evidence; asynchronous handoffs do not fabricate meetings |
| Library | Dense shelves, classified stations, globe, reading lamps/desks, query terminal | Native256pixel rendering is simpler than high-resolution concept imagery |

This closes the optional world-filling presentation gap, not final reference-fidelity
approval. Source truth and replay behavior remain independent of fullscreen.
