# Fresh browser convergence — 2026-09-08

Current checkout proof: `npx tsx scripts/live-convergence-proof.ts` passed actual Dispatch/SDK handoff, local RAG retrieval, and Eval failure followed by a repaired pass. Watchdog, gateway and browser transport were unmocked. The SDK model was an offline fixture; this is recovery verification, not a new real-model product proof. Real-model writing/code evidence remains in ../packaged-missions and ../packaged-repair.

The browser disconnected before the repaired Eval run. Source execution continued. After reconnect, browser agent truth matched the gateway, including both failed and passed attempts. Reconnection converged in 621 ms in this one run; zero page errors. This is not a latency distribution or long-duration qualification. See proof.json and reconnected.png. The original earlier live browser timeout cause is still unproven.

The accompanying controlled transport regression recovered a deliberately unanswered health request in 6,087 ms. Health and initial snapshot requests now have five-second cancellation deadlines, and entering replay cancels outstanding health requests. SOURCE/FEED labels distinguish transport freshness from operation activity.

Typecheck, architecture boundaries, authored maps, all unit tests and production build passed. No eight-hour soak was started. Existing high-throughput, native hidden-tab, browser zoom and visual-fidelity qualifications remain open. The previously packaged 05cff77 preview predates these recovery fixes; use the current checkout.
