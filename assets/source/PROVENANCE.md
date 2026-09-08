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
