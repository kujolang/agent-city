# Real Kujo room tour — 2026-09-26

Watch `agent-city-kujo-tour.mp4`: approximately 94 seconds, 768 × 720, nearest-neighbor
scaling, game canvas only, no audio, DOM panels, chat, or desktop. The full original browser
capture is `agent-city-kujo-tour.webm`; the MP4 removes only trailing idle footage. No speed
changes, fabricated activity, or reordered frames. Camera selection changes from the author
to the separate observed checker; the canvas HUD identifies the followed execution.

Real mission: `mission-15577793-2cda-4a47-a4f1-8eead3f75cc7`.
Configured provider: Codex ChatGPT text adapter. Actual Dispatch/SDK execution, local RAG
retrieval, public Kujo MCP catalog invocation, reviewer handoff, and Kujo static check.
Observed rooms: Workshop, Library, MCP, Dojo, with city travel between them. The MCP
interior is brief because the live camera switches to capture the checker's Dojo journey.
Async review does not fabricate a physical meeting.

The task produced `order-total.kujo`, with subtotal and discount functions for prices
12, 8, 5 and a discount of 5. Static syntax check passed; generated code was not executed.
`senior-review.md` contains the actual model review (A-, an opinion, not a test verdict).
The reviewer expresses uncertainty about separate retrieval evidence in its supplied
context; `proof.json` retains the actual observed retrieval and other operation evidence.

Verification: real mission completed; syntax valid; required rooms captured; no browser
exceptions. MP4 decoded without errors, contains one H.264 video stream and no audio.
Frames visually inspected to confirm only the game design is visible. The reusable
capture harness is `node --import tsx scripts/record-kujo-tour.ts`; it requires an idle,
configured local application (default port6178) and consumes real provider usage.
TypeScript verification passed. No application behavior or sibling repositories changed.

## Social cut

`agent-city-kujo-tour-social.mp4` removes the opening 8.5 seconds to start directly on
an agent inside the Workshop leaving for the city. At exactly 8.0 seconds the exported
capture still showed the city; the 8.5-second cut matches the requested room opening.
Duration:85.4 seconds. All remaining footage stays in order at normal speed. Original
MP4 and source recording retained. Opening frame inspected and full decode verified.
