# Fresh packaged stack verification

`proof.json` records a fresh extraction of the darwin/x64 preview at Agent City
`92152f6`, with Watchdog `fadad4e`. The default launcher ran with
`CITY_PORT_OFFSET=30000`, initialized the included local docs index, started all
seven processes, served the city through port 35178, and shut down cleanly.
All six owned ports were released. The previously occupied gateway port remained
occupied; other original ports were free before and after. No existing process
was killed. The isolated state lives in `.runtime/instances/30000`.

Readiness took 8,436 ms in this run; this is not a stable performance benchmark
on the user's heavily loaded host. `fresh-stack.png` shows actual empty truth and
an unconfigured model. No fabricated agents or model executions were involved.
Correct offset-origin requests reached configuration validation; a foreign origin
was rejected. The browser rendered successfully without page errors.

The first attempt failed because readiness omitted the bearer token on the newly
secured MCP health endpoint. That is retained as log-import Casefile
`2026-09-08-122158-citylaunchermcpauth`. The corrected launch passed. RAG bootstrap
also now checks the actual namespaced index filename, preventing repeat ingest.
Watchdog's existing http_listen primitive now accepts WDG_HOST through a small
producer change; Agent City sets 127.0.0.1. The native telemetry API suite passes,
and the extracted Watchdog startup log confirmed its loopback bind. Default
Watchdog binding remains compatible for other consumers.

43 Agent City tests, typecheck/maps/boundaries/build and the isolated-mission-store
controlled contract passed. A test-discovery problem caused Vitest to collect
producer tests inside extracted bundles; vitest.config.ts now limits discovery
to tests/**/*.test.ts. Those source-test failures were not runtime failures.

Latest archive: `.runtime/bundles/agent-city-preview-darwin-x64-92152f679be6.tar.gz`.
SHA256 `3035292e07135d0d0cb2d1c90f589af762952d4f812366f1d5aee68b3dae4142`.
15,311,253 bytes; 1,137 content-hashed files. Full receipt: `bundle-receipt.json`.
This supersedes earlier previews for the new offset launcher. Release remains
PREVIEW: complete reference fidelity and performance/reliability gates are open.
No eight-hour soak was run. This startup proof does not replace real-model proof.
