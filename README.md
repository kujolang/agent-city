# Kujo Agent City · research and architecture

**Research complete; application implementation has not begun.** September 7, 2026.

Agent City is a spatial debugging interface over Kujo: meaningful top-down travel, side-view activity spaces, and accessible inspection of actual agent work.

Start with [the architecture report](research/report-source.md), then hand [the Phase 1 build contract](research/phase-1.md) and [protocol specification](research/protocol.md) to the implementation agent. [Evidence](research/evidence.md) distinguishes checked-out source from released capabilities. [Repository inventory](research/repository-inventory.json) records the discovery baseline. [Verification](research/verification.md) records what was actually checked.

Recommendation: **PixiJS 8 + WebGL, pure TypeScript world core, Watchdog's existing canonical telemetry feed, small source lifecycle adapters, SSE, Tiled, and DOM inspectors.** Kujo runtimes retain authority. RunLedger remains a receipt ledger, not a replacement event history. Live lifecycle instrumentation is the first build gate.

No artwork, game application, production service, or runtime changes are included in this pack.
