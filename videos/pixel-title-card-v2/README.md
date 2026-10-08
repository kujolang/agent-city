# Agent City pixel ident — revision 2

[Watch the six-second 720p export](agent-city-pixel-v2-720p.mp4).

Revises the earlier plain title card at the user’s request. Actual original Agent
City overworld, Library and Workshop captures now fill the background. Locally
bundled Press Start 2P provides true pixel typography. The design starts immediately;
the original second line appears at two seconds. The 640×360 composition is exported
at 1280×720 using integer nearest-neighbor scaling.

Narration: “Agent City. Real agents. Visible work.” Generated with ElevenLabs
`eleven_v4`, Siren (`eXpIbVcVbLo8ZJQDlDnl`), using the existing saved account.
The narration starts at 0.25 seconds and lasts 3.52 seconds. No credentials are
stored here. The music endpoint rejected the key for missing `music_generation`
permission; the accompanying chiptune is an original locally synthesized score,
reproducible with `python3 compose-music.py`, not ElevenLabs music or a copied game
soundtrack. Its level dips under narration and fades at the end.

Editable HyperFrames 0.8.141 project: `index.html` and `compositions/`. Run `npm run
check`, `npm run render`, then `npm run export:720p`. The local Studio preview is
http://localhost:3002/#project/pixel-title-card-v2 while its preview service runs.
The HyperFrames desktop app also supports editing this project with Framey.

Verification: HyperFrames check has zero findings; all 180 frames rendered; both
exports fully decode; H.264/AAC delivery has the requested duration and frame rate.
A three-frame contact sheet was visually inspected. See `evidence/verification.json`
and `asset-ledger.json` for source hashes, voice provenance and output checksums.
No complete human listening/playback approval or new agent execution is claimed.
This creative revision does not close the separate Agent City release blockers.
