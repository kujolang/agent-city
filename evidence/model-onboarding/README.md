# Provider onboarding evidence

2026-10-07 local browser proof: authenticated Mission Command detected three
models exposed by the real local Ollama instance, selected one without saving or
executing it, and checked its actual model listing. A request without the command
token returned403. See proof.json and setup.png. The selected model was a cloud
model exposed through local Ollama: local endpoint does not mean local inference.
No prompt, model generation, task, or synthetic semantic activity was emitted.

Reproduce against a running isolated City stack:

```sh
CITY_BROWSER_URL=http://127.0.0.1:9178 node --import tsx scripts/provider-onboarding-proof.ts
```

Set CHROMIUM_PATH if needed. This run used installed Google Chrome because the
current Playwright browser package had no matching downloaded executable.
Full verification passed64tests/20files, typecheck, maps, boundaries and build.
A first real mission and reviewer still provide the generation/quality proof;
metadata discovery is not that proof. Public fresh-machine qualification remains open.
