# Original character strides

The original 20×24 Kujo canine silhouettes now have four authored leg frames for overworld and side-view walking. The prior compiler reused resting legs for frames 0 and 2. The new source tables define rest, stride, passing and opposite-stride poses, with a small counter-swing of the visible forearm. Existing appearance IDs, colors, accessories, sprite footprint, atlas layout and animation timing remain unchanged. No protected image pixels were sampled.

`assets/source/characters.json` is the editable source; `scripts/compile-characters.py` compiles the PNG. The renderer already selects these atlas frames using world-core's animation and tick. No runtime truth, movement path, position, operation or outcome is created by this change.

Verification: `scripts/character-stride-proof.ts` loads the actual compiled PNG in Chromium and inspects all eight appearances in both views. All 16 sets contain four distinct frames; zero page errors. `gallery.png` is an asset review, not a live-operation screenshot. It was visually inspected for outlines, feet and profile distinction. Typecheck and production build pass. Repeated compilation produced SHA256 `ef8005e2f8e31733a2abbfc643416dea2c1161ebd3ea72be28058105cfe0714a` both times. Atlas remains 280×1536 / 1,720,320 decoded RGBA bytes; PNG is 25,411 bytes.

The first gallery attempt navigated to a Vite root without an index document; the harness now explicitly serves its empty review document. Its initial browser variable also needed an explicit TypeScript type. These were harness defects, not source/runtime failures. No model or agent task was run for this asset check. Overall supplied-reference fidelity remains unapproved, and release throughput/visibility qualifications are unchanged.
