# Pinned local preview bundle

Artifact: `.runtime/bundles/agent-city-preview-darwin-x64-eb0582e8a94c.tar.gz`.
Size: 15,307,926 bytes. 1,134 content-hashed files.
SHA-256: `8b079192993c6b3c0b3dac2ad629b0d6c732ece207b05682559bf14f4796ce35`.
Source revisions and archive details: `receipt.json`.

The archive contains Agent City source/assets, six producer source checkouts,
the existing darwin/x64 Kujo 1.3.1 binary, licenses, startup instructions and a
content manifest. It excludes Agent City evidence/history, node_modules, local
runtime directories, databases, logs, environment files and Watchdog proxy settings.
No sibling repository was modified. Binary build provenance is not attested;
its digest and the separately observed Kujo source revision are recorded honestly.

Validation used a fresh extraction in `.runtime/bundle-extracted/`, with its own
`npm ci` installation (module resolution verified within that extraction).
Content verification checked all 1,134 pinned members. Extracted TypeScript/build
passed. The included binary reports Kujo 1.3.1. The bundled controlled mission
contract passed actual SDK/Dispatch/RAG/MCP behavior, six synthetic-provider
requests, reviewer/context checks and source recovery. See `mission-contract.json`.
This is packaging verification, not a new genuine-model product proof.

`preflight.json` found all packaged prerequisites and the existing occupied
5178/7792/7793 ports. No existing process was stopped. A fresh default-port full
stack launch was therefore not claimed. Node 24, npm dependencies, a configured
model and optional Chromium for function execution remain external requirements.
This is not an offline installer or a signed/notarized application.

To use: extract, open `START-HERE.md`, then launch `agent-city/Start Agent City.command`
on macOS or run `npm ci` and `npm start` in `agent-city`. After npm installation,
`npm run verify:bundle` checks file integrity, not publisher authentication.

Rebuild from committed clean tracked sources using `npm run package:local`.
The script refuses existing output directories and records pinned source hashes;
archive bytes are not claimed bit-identical across packaging timestamps/platforms.
Release status remains PREVIEW: visual fidelity and performance/reliability gates
are incomplete, and the eight-hour soak remains cancelled.
