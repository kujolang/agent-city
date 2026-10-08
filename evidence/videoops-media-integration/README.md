# Real VideoOps media integration — review candidate

[Watch the six-second candidate](candidate.mp4). It uses actual Workshop → Library
→ City product captures, Press Start 2P, previously approved ElevenLabs v4 Siren
narration and the original locally synthesized chiptune. The latter is not
ElevenLabs music. These are historical product images assembled by the real
VideoOps team, not footage of this production's agents moving. No new media
provider call or charge was made.

Mission `mission-d674d36a-bbcf-42c1-a1cd-36fde8e82a98` was submitted through the
actual Mission Command form. The existing Codex subscription connector alias
`codex-cli-default` ran the Kujo SDK Creative Director, Asset Scout and Editor.
Underlying model ID is UNKNOWN. The isolated Workcell run
`wc-6668093699674787876f78ddb8bdac52` rendered and cleaned up successfully.
All three roles passed on their first attempt in this corrected production.

Candidate: 6 seconds, 640×360, 30 fps, H.264 + stereo 48 kHz AAC, 309,517 bytes.
SHA-256: `98e5bd3a8d6ab5c08f01daeb489507ef290015aa7f17cc4b22c53e44c51146ce`.

## Evidence

- `proof.json`, `render-metadata.json`: actual execution and candidate identity.
- `observed-events.json`: 27 normal lifecycle observations in the scoped gateway.
- `audio-report.json`: canonical deterministic audio QA PASS; no listening approval.
- `mix-declarations.json`, `audio-input.json`: exact source hashes, provenance and
  declared timing/gain. Narration stays complete; music is attenuated beneath it.
- `contact-sheet.png`: six sampled frames inspected for product imagery, pixel
  font and readable titles. Sampling is not whole-video perceptual approval.
- `launch.png`, `media-ui.png`, `browser-checks.json`: real form, uploaded immutable
  pack selection, keyboard focus and missing-token rejection.
- `review-ui.png`, `review-ui-check.json`: exact candidate has technical PASS,
  visual/listening attestations remain unchecked, finalization unavailable.
- `verification.json`: local checks and native ShipCheck gate. ShipCheck passed
  with 3 existing warnings (lint command, optional Kennel metadata/Kujo entrypoint).

The initial richer run `mission-349b33ff-f934-4e79-a293-c393caf95e13` failed a real
HyperFrames static guard because the Editor animated clip visibility. Its Workcell
ended with cleanup complete; original evidence was retained and queue admission
was explicitly released. `failed-attempt-1` and CaseFile
`2026-10-08-141619-videoopsmediarendercontract` preserve this failure. The subsequent
production used tightened role/animation guidance; no failed attempt was erased.

## Reproduce and review

Use the [media setup guide](../../docs/videoops-media.md), choose an immutable
pack containing real imagery/font and explicitly approved audio, then submit a
six-second production. No personal credentials or approved audio are installed
for other users by default. The bundled preset contains original imagery/font only.
Fresh speech/music/SFX requests require their own current entitlement evidence,
exact text/model/voice binding and spending authorization. Their adapter boundary
is covered by mocked success/unknown tests and an actual canonical CLI test that
blocks before dispatch when credentials are absent; this is not fresh live SFX or
music capability proof.

Current candidate is **REVIEW_INCOMPLETE**. Watch and listen to this exact file,
then record the actual result. Prior approval of the separate Pixel v2 promo
cannot finalize this candidate. No release was published and no eight-hour soak ran.

Integration code commit `7e023d601fcd878e40b1c70887e6d9c8707f3e6d` passed [CI 37824308063](https://github.com/kujolang/agent-city/actions/runs/37824308063), all five jobs, including installed macOS Intel/ARM and Linux x64/ARM checks. Local full verification passed 173 tests/67 files, with two additional footage/narration regression tests afterward. This does not replace exact-video human review.
