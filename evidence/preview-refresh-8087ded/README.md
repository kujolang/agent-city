# Current local preview — 8087ded

Bounded local preview verification PASS; overall public release remains FAIL / incomplete.

- Archive: .runtime/bundles/agent-city-preview-darwin-x64-8087ded0af71.tar.gz (see receipt.json for exact hash).
- Fresh npm ci: PASS; 1,158 manifest hashes: PASS; extracted TypeScript: PASS.
- Source final TypeScript, 52 tests / 16 files and production build: PASS.
- Packaged synthetic-provider contract: PASS on 76914dd (six requests, real SDK/RAG/MCP, recovery/authorization checks). Manifest comparison confirms final changes only in browser file-boundary helper and capability guide; mission/producer/runtime inputs are byte-identical. No new real-model execution is claimed.
- Fresh full-stack launcher: PASS, seven services, empty truthful initial world, unconfigured model, correct-origin validation and foreign-origin denial, ready Pixi renderer, no browser errors, runtime canary denied for ordinary/raw/url requests.
- Startup sample: 10,438 ms on the user's busy host; not a general performance qualification.
- Shutdown: exit 0, all six owned ports released; existing port 7792 listener unaffected.
- Runtime: explicitly reused integrity-verified prior Kujo binary; source-build correspondence remains unattested, as disclosed by the manifest.

Start from the extracted agent-city directory with npm start or the supplied macOS Start Agent City.command. Configure an actual provider in Mission Command before submitting tasks. Older extracted previews do not update automatically and should not be used for private missions.

Open gates remain full-path throughput, native hidden-tab qualification, writing quality with the current model, and visual fidelity approval. The eight-hour soak remains cancelled. See WORKING-EXPERIENCE.md and the existing evidence/SignalBox records. No broad sibling repository changes were made.
