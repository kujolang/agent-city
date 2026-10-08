# Isolated VideoOps render qualification

PASS for an actual Linux Workcell render of an original controlled composition.
This is a renderer integration fixture, **not** an agent-authored production video.

CI [37788990120](https://github.com/kujolang/agent-city/actions/runs/37788990120)
at source `60537e917c0309461e7605b64a0aee7c2863203a` built the render image,
installed the pinned application/dependencies and ran the network-disabled Workcell.
The completed receipt proves export and cleanup, not merely CLI exit.

- Workcell: `wc-7a94bfb3d0fe482cb8ffd1e20b7dfb55`.
- HyperFrames: 0.8.141; dependency lock retained under installer/videoops.
- Image: `sha256:976763746bf7c355fb72cc0486e37dbc0f084a0bfb0fa7c65f28cb5b8aaaeaa8`.
- Output: 640×360, 30fps, 3.000 seconds, H.264, 25,573 bytes.
- Candidate SHA256: `8617b8aaab93b96c980e6eaa21be04fbeddc270fc07222fae99209c8a9bb8959`.
- HyperFrames check:4,317ms; render:3,436ms; full FFmpeg decode:56ms on this CI runner.
- Downloaded video SHA independently matched the Workcell artifact receipt;
  local ffprobe confirmed dimensions, rate and duration. One frame was inspected.
- Technical PASS; perceptual NOT_REVIEWED; publication NOT_PERFORMED.

[draft.mp4](37788990120/draft.mp4), [actual frame](37788990120/frame.png),
[receipt](37788990120/proof.json), [CI receipt](37788990120/ci.json).

The fixed image entry point chooses commands; composition text cannot select host
commands. Workcell uses an immutable local image, no network, no secrets, read-only
root, a disposable generated workspace, bounded CPU/memory/PIDs/time and explicit
exports. The image supplies its own GSAP. At most60seconds/1920×1080-equivalent
pixels and supported fixed rates enter this adapter; video export is capped32MiB.
It currently accepts composition text, not arbitrary acquired binary media imports.
Broader media support is not claimed.

No large image was built on the disk-constrained local Mac. CI has a20minute job
ceiling and a300second Workcell timeout; no soak ran. Base image and npm dependencies
are pinned; apt packages resolve at build time, so the immutable resulting image
ID, not bit-reproducible rebuilds, is the runtime identity.

Remaining: connect Editor output to this adapter in the production workflow,
independent exact-candidate review, user-facing controls, real model production
proof and qualification of a new release. Immutable rc.2 is unchanged.
