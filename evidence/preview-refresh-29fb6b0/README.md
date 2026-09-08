# Current verified local preview — 29fb6b0

Local preview verification PASS. Overall release remains incomplete; this is not a public production release.

Archive: `.runtime/bundles/agent-city-preview-darwin-x64-29fb6b020907.tar.gz`.
SHA256: `968b7e671d02c7c3152486db4010e1fe5b9f3e7d1939333adc035611ae1d03d6`.
16,914,067 bytes; 1,159 manifest files; darwin/x64. Runtime reuse/provenance limitations remain in receipt.json and the bundle manifest.

This refresh includes the original service-room artwork, MCP/current-request ordering fix, bounded native normalization and conflicting retry detection, alongside the prior browser private-file boundary.

Fresh extraction verification:
- npm ci, complete manifest verification, TypeScript and production build PASS.
- Bridge proof PASS: 36/36 synthetic operations through actual Watchdog and gateway, byte-identical retry, partial normalization recovery, conflicting sent identity and missing evidence rejected, equivalent reordered JSON accepted. See bridge.json.
- Eight-request synthetic model contract PASS with actual SDK/Dispatch/RAG/MCP, context ordering, authorization and source/receipt recovery. See contract.json. This is not new live AI quality evidence.
- Full-stack launcher PASS: seven services, truthful empty initial world, model unconfigured, Pixi ready, no browser errors, private runtime canary denied, origin controls preserved, exit 0 and all six owned ports released. Startup sample 5,222 ms on a busy host is not a performance qualification. See launcher.json.

Extract the archive, open `agent-city/Start Agent City.command` on macOS, or run `npm ci` then `npm start` from its agent-city directory. Configure a compatible model in Mission Command. The bundled TRY-AGENT-CITY.md explains writing/code/follow-up tasks. Real execution instances appear only after observed work; model credentials and prior private missions are not bundled.

This supersedes the 8087ded preview for local review. No real-model retry or eight-hour soak ran. Open gates remain writing quality with the current model, visual fidelity, canonical intake throughput and native hidden-tab qualification. No sibling repository changes were made.
