# Fresh packaged real missions — 2026-09-08

The extracted preview 05cff77f7310 installed dependencies, verified 1,141 hashed
files, started all seven local services and ran real writing/code tasks through
the browser UI. It used the existing Ollama qwen2.5-coder:1.5b-instruct model and
a new isolated offset-30000 runtime. The supplied model configuration was saved
through the UI. This is new source execution, not fixture playback.

Writing mission-7babc419-e363-44fd-9c20-a1b411751551 completed with actual local
RAG, MCP read_project_docs and SDK reviewer handoff. Browser track records
Workshop → Library → MCP visits. Both actual model responses and output are in
writing.json. QUALITY FAILED: output did not honor three short sentences and
added unsupported material. Runtime completion is not content correctness.

Code mission-c0f86c6f-5994-481f-9b01-6861194ea7f5 completed model execution but
returned an unterminated Markdown fence. Syntax was invalid and all three explicit
function checks failed with module-error. These failures are retained in code.json;
the application did not fabricate a successful check. The previously demonstrated
failed-then-repaired/pass cohort remains in evidence/live-missions; this new bundle
run does not claim a repaired code result.

The launcher proof passes startup, origin protection, actual mission submission,
real worker/reviewer response collection, evidence-backed MCP travel and owned
service shutdown. It does NOT pass model-output quality or the full release gates.
Readiness was 5,820 ms on the loaded host; this is one observation, not a performance
budget certification. All six owned ports closed and original listener availability
was unchanged. Browser page errors: zero.

Latest archive: .runtime/bundles/agent-city-preview-darwin-x64-05cff77f7310.tar.gz
SHA-256: 6fc712360e22ea4795f920c7e57f8873c6dec694f87a30a1c55c77a4fceb22b5
15,315,766 bytes. Includes Watchdog cdd4d9b and Agent City 05cff77. Binary/source
provenance limitations, Node/model/browser prerequisites and incomplete release
qualification still apply. See bundle-receipt.json.

Reproduce on a fresh extraction with dependencies installed:
CITY_LAUNCHER_REAL=1 npx tsx scripts/launcher-proof.ts /path/to/extracted-bundle
This opt-in diagnostic runs real local-model tasks, owns only its test services,
and is bounded to eight minutes. It is not an eight-hour soak.

The report's initial empty/unconfigured assertions were renamed after inspection
to distinguish startup state from the configured application after the missions.
No source event or outcome was changed by that report correction.
