# Original Agent City assets

The maps, pixel glyphs, geometric worker, facades and interiors were authored for
Kujo Agent City during this implementation. No screenshot, sprite, map, logo,
music, or image pixels from a protected game were copied or traced. The supplied
visual pack was not available on disk; the user's written visual direction was
used. These are clearly labeled original geometric placeholders.

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
Multi-level rooms, richer characters and varied city topology remain unfinished.
