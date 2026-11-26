# Agent City interactive tour

Follow a real release-notes mission through the city. The seven-stop tour shows
how to trace a source, inspect a tool and its review, and check the result.

Open [the chapter player](player/index.html) in a browser. Choose a stop to jump
to its zoom, or press Play to take the full tour. Use **Captions** for
English subtitles and open **Transcript** to read or jump to a section. Arrow keys
move focus between stop buttons. The standalone
[1080p MP4](agent-city-tour.mp4) and [English captions](captions.vtt) are also
available.

For a local player URL, run `npm run player` and open
[localhost:8837/player](http://127.0.0.1:8837/player/).

## Edit and render

- `chapters.json` holds the script and on-screen copy. `timings.json` holds the
  narration and shot timings. Run `python3 compose.py` after editing either file.
- `index.html` and `compositions/` are the editable HyperFrames project.
  `camera.js` uses [Motion](https://motion.dev/docs/animate) 14.14.0 Bézier curves
  in a seekable GSAP timeline. The player uses the same local Motion bundle.
- Run `npm run preview` for the editing preview, `npm run check` for validation,
  and `npm run render` to regenerate the 1920 × 1080, 30 fps export.
- The original stereo score and effects can be regenerated with
  `python3 score.py` using NumPy and FFmpeg.

## Sources

The room and city images come from [Agent City product captures](../../evidence/game-view/).
Library, MCP Center, Workshop and Dojo use crops of the
[recorded release-notes run](../../evidence/reviewed-release-tool/README.md).
The Archive stops on a crop of the
[same mission's completed screen](../../evidence/reviewed-release-tool/repaired/completed-full-page.png).
Dispatch uses a product still to illustrate the starting step. Some recording
segments are slowed to fit their narration.

Siren reads the script using [Eleven v4](https://elevenlabs.io/docs/overview/models).
[Voice receipts](voice-receipts.json) record the model, request IDs and clip hashes.
The pixel font and Motion bundle include their licenses in `assets/`.
