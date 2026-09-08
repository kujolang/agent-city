# Current portrait application browser verification — 2026-09-08

Tested current application source 02d00d9 against the retained convergence SDK/RAG/Eval journal on an isolated port-offset stack. These are actual retained runtime records (the SDK model in that cohort was an offline fixture); no new agent/model task ran. Source restart gaps remained explicit.

The full application passed DPR 1, DPR 1.25, DPR 2/320px, keyboard roster selection, replay isolation, reduced motion and no horizontal overflow. The explicit renderer-off view kept all three roster entries and readable fallback text. Zero page errors. Screenshots and browser.json retain measurements. Inspector synchronous callback time was 0.9–1.6ms; this is not click-to-paint latency. Frame p95 was 83.3/150/16.8ms in the respective cases on the busy host, not a claim of sustained 60 fps. CDP page scaling is explicitly not browser UI zoom.

The focused context-check run strengthened recovery evidence: it asserted gl.isContextLost() became true, then false after restoration, and recorded a reviewed screenshot showing the city rendering again. DOM roster remained available. This closes the ready-flag-only evidence weakness, not native tab visibility, OS sleep or GPU exhaustion qualification.

The harness now supports CITY_BROWSER_URL and CITY_BROWSER_OUTPUT, reuses the installed Chromium helper, bounds execution to 90 seconds, closes its one owned browser, and asserts overflow/page-error conditions. CITY_BROWSER_CONTEXT_ONLY=1 runs the focused DPR 1 case; its report cannot substitute for the full display matrix.

Release assessment now reads both explicit reports and requires observed loss/restoration. All 49 unit tests and typecheck passed. The release command correctly exits 1: end-to-end throughput still fails, while native hidden-tab, browser UI zoom and cancelled long-duration coverage remain unqualified. No soak started. Owned stack shutdown exited 0 and released all six service ports (shutdown.json).
