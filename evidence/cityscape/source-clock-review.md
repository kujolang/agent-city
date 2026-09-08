# City source clock correction — 2026-09-08

City labels previously derived “now” from the latest agent observation. With no new events that reference time did not advance, so an old source could continue to appear LIVE while the DOM inspector used actual observation time and showed RECENT/STALE.

The app now injects observation time into renderer.draw independently of presentation ticks. The renderer passes it to the existing pure buildingState calculation. It does not read a wall clock itself or mutate truth. Optional event-time fallback preserves older deterministic renderer callers; replay semantics and pinned semantic hashes are unchanged. Building labels now prefix health with SRC, separating source state from agent activity.

The browser regression redraws retained truth at two injected times sixty seconds apart, with identical presentation state: 432 pixel channels changed and serialized truth remained identical. Existing Dojo failure/pass glyphs and replacement-snapshot checks still pass; zero page errors. Typecheck/build passed. The initial test helper failed browser serialization with __name undefined and was replaced with direct pixel reads; its log is retained. An independent host process-creation resource error occurred while the test was running; that process was polled to completion rather than duplicated.

This is a source-freshness presentation fix, not a new source operation, throughput qualification or native hidden-tab test.
