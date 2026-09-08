# Evidence ledger and research limits

Observed September 7, 2026. Relative source paths below refer to sibling Kujo repositories. The immutable-link appendix is generated from each inspected checkout's full HEAD. [Inventory](repository-inventory.json) records 127 immediate sibling Git repositories, revision, branch, remote and dirty flag. Discovery is not a claim that every repository was exhaustively reviewed. Runtime state directories, credentials, user conversations and generated workcell copies were excluded from source analysis.

## Research method and stopping rule

Research questions: authoritative agent/task/run identity; actual lifecycle emission versus enum/documentation; durable/replay coverage; smallest source adapter seam; rendering/game layer and assets; feasible phased implementation. Source classes: local implementations, schemas, contract tests, examples, current release metadata, upstream project documentation, supplied references, and specialist console documentation.

Discovery inspected immediate sibling repositories and relevant README/schema/module paths. Follow-up traced SDK runner→tools/retrieval→finished-result projection; Dispatch runner→hooks/trace; Relay event→chain→watch; Watchdog native normalization→canonical persistence→cursor JSONL; RAG trace→audit; Eval projection; RunLedger correlation and AI Chat durable event replay. High-impact claims were spot-checked directly in parent research and existing tests were executed where bounded and useful. Renderer research compared current Pixi/Phaser versions rather than assuming stale indexed versions. No full app, game benchmark or live-provider run was performed.

Planning-tool discovery found no callable `update_plan`; this file preserves the required scope/discovery/follow-up/synthesis/verification record. Independent runtime and external-rendering research lanes completed; the primary researcher reconciled them, inspected consequential source paths, authored all artifacts and verified the pack. Research stopped when all requested answer slots had either primary/source evidence or an explicit proposed/future/unknown boundary. More engine lists would not change the small 2D renderer decision; remaining work is lifecycle implementation and performance measurement, not unresolved architecture brainstorming.

## Local source ledger

| Claim / capability | Repository source, symbol or contract | Verification / qualification |
|---|---|---|
| SDK agent configuration, identity and execution contract | `agents-sdk/src/agents/core_types.kujo`: `create_agent_config_impl`, `create_agent_impl`, `agent_execution_compatible_impl`, `create_agent_message_impl` | Agent configuration is not persistent daemon or occupational-role registry |
| SDK event vocabulary | `agents-sdk/src/agents/events.kujo`: `event_kind_values_impl`, required fields | Run/model/tool/memory/handoff/guardrail/artifact/budget names; no RAG lifecycle enum |
| SDK actual live coverage | `agents-sdk/src/agents/runner.kujo`: run start ~1865, model start ~2088, tool call ~2475, returned metadata.events ~3399 | Tool step executes and result is saved without matching enum lifecycle emission at that path; no generic external observer sink established |
| Retrieval execution | SDK runner `maybe_inject_retrieval_context` ~1376; `src/agents/retrieval/rag_adapter.kujo`; `examples/rag_documentation_agent.kujo` | Existing real local RAG + offline callback example, caller wrapper can observe real operation |
| Handoff relationships | SDK runner ~2922; `src/agents/handoffs/handoff.kujo` | Source/target/parent run metadata; not general messaging bus |
| SDK clock and IDs | `src/agents/runtime/clock_ids.kujo`: `next_runtime_id_impl`, `default_now_iso_impl` | Counter scope and coarse non-timezone default; explicit integration identity/time quality required |
| SDK telemetry | `src/agents/tracing/watchdog.kujo`: `watchdog_telemetry_batches_from_run_result_impl` | Finished-result adapter, not proof of delivery during run |
| SDK contracts tested in repo | `tests/runner_result_event_contract_tests.kujo`, `arch_runtime_clock_ids_tests.kujo`, `watchdog_telemetry_contract_tests.kujo`, `handoff_contract_tests.kujo` | Tests inspected/identified, not all executed this session |
| Role catalog | `kujo-agents/agent-registry.json`; `chain-of-command/general-commander/manifest.json` | 85 static role entries; manifest permissions are runtime-adapter enforced, static record not online presence |
| Dispatch step/task model | `dispatch/src/core/step.kujo`: `create_step`; `src/agents/agent.kujo` | Agent/tool ownership, dependencies, retry/timeout/approval/attempt fields |
| Dispatch live hooks | `dispatch/src/core/runner.kujo`: `emit_lifecycle_event`; `src/core/hooks.kujo`: `create_lifecycle_event`, `emit_hook_event` | Callback, JSONL sink and HTTP delivery are inline; lifecycle ordinary payload lacks explicit actor; ID hashes omit occurrence timestamp |
| Dispatch JSONL framing | `src/core/hooks.kujo`: `emit_hook_event` | Deliberately no trailing newline, next write prepends separator. A newline-only tailer delays newest event |
| Dispatch bounded trace | `dispatch/src/core/trace.kujo`: `default_trace_limits`, append/finalize/render functions | 400 events, 2400 payload chars defaults; drops/truncates; native export uses conversion-time `current_timestamp` |
| Dispatch fixture flow | `dispatch/examples/workflows/documentation-query.json` | Existing documentation tool step, not itself an SDK agent run |
| Dispatch tests | `tests/dispatch_tests.kujo`, `operational_controls_tests.kujo`, `hardening_tests.kujo` | Hooks/outbox/trace/framing test sources; no full Dispatch suite executed here |
| Relay ordered events | `relay/src/runtime.kujo`: `add_event`; `src/contracts.kujo`: `event`, `event_chain_integrity_valid`, `event_sequence_matches_state` | `parent_event_id` means predecessor in serialized chain, not semantic causal parent |
| Relay streaming/replay | `relay/src/cli.kujo`: `watch_run_events`; `src/common.kujo` | Existing `runs events --after --limit`, `runs watch`, inspect/verify/export; 1 MiB JSON / 8 MiB JSONL limits |
| Relay tools/mission evidence | `relay/src/runtime.kujo`, `src/registry.kujo`: `agent_catalog`; schemas event/run/receipt | Four Relay profiles link to Kujo role packages; many tool/model details become aggregate terminal evidence |
| Workcell evidence | `workcell/src/receipts/receipt.kujo`: `new_receipt`, `add_state`; `src/receipts/v2.kujo`: `new_v2_receipt`, `checkpoint_v2` | v1 execution harness plus additive v2 lifecycle; don't confuse alpha/new proposals with stable harness |
| Workcell caller correlation | `workcell/src/domain/caller_context.kujo`: `validate_caller_context` | Caller/correlation required; optional workflow/step/attempt/causation links |
| Workcell Studio pattern | `workcell-studio/README.md`, `docs/ARCHITECTURE.md` | Shared services for inspect/run/eval/evidence; app-specific session isolation |
| Watchdog canonical/native contracts | `watchdog/schemas/watchdog-native-event-v1.schema.json`, `telemetry-v2.schema.json`, `docs/native-event-contract.md` | Metadata-only observation families, references and source fields; host coverage explicitly limited |
| Watchdog native mapping | `src/telemetry_native_adapter.kujo`: `native_normalize_event`, `native_normalize_batch` | Source IDs hashed, original native kind preserved, missing end defaults to start; events have no timed span fields |
| Watchdog immutable records | `src/telemetry_repository.kujo`: `repo_insert_batch_rows` | Exact duplicate dedup; differing canonical hash rejected, not overwrite/upsert |
| Watchdog export | `src/dashboard_server.kujo`: `jsonl_v2_cursor`, `jsonl_v2_response`, `GET /telemetry/v2/jsonl` | HMAC cursor; ascending database ID; checksum/count/manifest headers; no epoch/complete retained-coverage contract established |
| Watchdog producer identity tests | `tests/telemetry_native_adapter_check.js`, `tests/telemetry_v2_identity_conflict_suite.js` | Both executed PASS during research |
| RunLedger receipt | `runledger/src/record.kujo`: `new_record`, `empty_correlation`, `valid_statuses` | `in_progress/pass/partial/fail/abandoned`, commands/tests/notes/followups, correlation to Watchdog/Dispatch/Relay/Eval; not event engine |
| RAG request/trace | `rag/src/query_api.kujo`: `ensure_request_id`, `trace_emit`, `emit_query_stage_traces`; `src/audit_log.kujo`: `append_audit_event` | `trace_emit` constructs audit details including endpoint string and calls audit emitter; no network OTLP send in that function |
| RAG retrieval source | `rag/src/retrieval.kujo`, `src/rag_engine.kujo`, `openapi/kujo-rag-openapi.json` | Hybrid retrieval/source citations; request correlation ≠ live actor lifecycle |
| Eval telemetry | `eval/src/watchdog_telemetry.kujo`: `watchdog_evaluation_events`; `tests/watchdog_telemetry_tests.kujo` | Result summary + up to 99 checks, truncated_count, no raw output; constructor call/delivery must be integrated |
| MCP observation | `mcp/src/telemetry/watchdog.kujo`: `watchdog_mcp_tool_event`, `watchdog_mcp_tool_lifecycle`, `watchdog_mcp_trace_metadata` | Constructors preserve roles/correlation; delivery is caller-owned |
| Ability contracts | `ability/src/contracts.kujo`, `src/runtime.kujo`: `audit_event`, `terminal_receipt` | Exact ability ID/version/digest, invocation/principal/policy/approval/idempotency already exist |
| Ability-MCP projection | `agents-sdk/src/agents/abilities/contract.kujo`; `mcp/src/abilities/projection.kujo`, `gateway.kujo` | No separate `ability-mcp` checkout required |
| Remote gateway scope | `ability-gateway/README.md` | Controlled beta; customer backend adapters explicitly not enabled; fixtures not production catalog |
| AI Chat saved executions | `ai-chat/lib/execution-journal.js`: `appendEvent`, `events`, `reconcile`, `prune`; `public/execution-replay.js` | Per-run sequence and durable call receipts; expiry/reconciliation affect replay completeness |
| AI Chat replay behavior | `ai-chat/tests/execution-replay.test.js` | Four tests executed PASS: unseen cursors, cancel, terminal attempt, UTF-8 stream parsing |
| Search evidence telemetry | `searchbridge/src/telemetry.kujo`: `otel_payload`, `validate_otel_privacy`, `export_otel`; schemas | Actual bounded export helper exists; do not confuse with RAG audit-only path |
| ShipCheck result vs publication | `shipcheck/src/report.kujo`: `report_json`, `gate_passed`; `schemas/shipcheck-report.schema.json` | Gate/report, not proof that a release published |
| Failure artifacts | `casefile/src/capture.kujo`, `src/redactor.kujo`, README | Failure capture/provenance, not constant live agent history |
| Dependency/distribution and quality tools | `kennel/README.md`, contract schemas; `changebucket/README.md`; `spec/README.md`; `fence/README.md` | Tool-specific artifacts/gates rather than another runtime registry |
| Context and developer workflow | `scent/README.md`, `muzzle/README.md`, `howl/README.md`, `lens/README.md` | Context packs, quiet runner, showcase output and browser verification respectively |
| UI assets | `site-kit/README.md`, `components/modal/modal.html`, `package.json` | Vendored generated dist/semantic HTML; preserve font license and relative paths |
| Static site and recall ingest | `ssg/README.md`, `totalrecall/README.md` | Static publication and knowledge ingestion, not live City transport |
| Leash events | `leash/contracts/event.schema.json`, README | Machine/session event and approval schema; tmux-detected events are not universal ground truth |

## Runtime model details

SDK sources define agent config and execution requests/results separately. `role` is assistant/system-style chat metadata. Persistent role/persona binding is a City/host configuration relation, not a new runtime authority. Agent identity, session, run, source occurrence and attempt must survive the integration seam. If no actor binding is available, the accepted observation can still support a building-level activity count without inventing a worker.

Dispatch and Relay are complementary but not a forced universal stack. Dispatch offers live step hooks plus task state and retries; Relay offers bounded mission evidence with verifiable ordering. Workcell is an execution environment/receipt, not a queue or a persona. The common references through Watchdog allow composition without merging the systems' ownership models.

## Watchdog feed and correctness

The feed exists in the inspected HEAD even though latest release badge/release version alone does not establish it. Its signed cursor identifies the database row sequence; source timestamps are separate. Hash verification detects corrupted response bytes, not whether all historical producer events were emitted. A successful trace/span is not parent task success. Repeated source lifecycle occurrences need distinct canonical record IDs. Unknown actor, retention loss, source replacement and conversion-time timestamps must remain visible.

A notable native adapter edge: instantaneous events get `record_type=event` and omit span timing; original native kind remains in attributes. Producers wishing to preserve original occurrence time for City must explicitly carry approved occurrence metadata and test canonical output. The core protocol specifies this convention. A declared `ended_at_ms` omission is not an active-span guarantee.

## Historical reconstruction

| Source | What can be replayed today | Missing for full City history |
|---|---|---|
| RunLedger | Recorded start/end receipt facts, tests/commands/notes and correlations | Full agent movement-driving lifecycle/message/query history |
| Relay | Persisted ordered observed milestones, verified chain, run exports | Omitted micro-actions, live operation start coverage; chain is not causality |
| Dispatch | Durable state + retained trace + configured hook sink | Trace truncation, actor/attempt/occurrence precision, sink retention |
| SDK result | Returned event subset + steps/artifacts/retrieval metadata | Live sink, missing tool event emission, robust global identity |
| Watchdog canonical export | Retained immutable observations and references in ingest order | Producer coverage, store lineage/retained-coverage signal, causal completeness |
| AI Chat | Retained per-execution sequence/call receipts | Other runtimes, pruned data and source-specific semantics |

Therefore report historical **partial milestone replay** accurately. Deterministic City replay is achievable from the new normalized package with pinned policy/map/identity inputs; deterministic reconstruction of activity never recorded is impossible.

## Release provenance and source drift

GitHub latest non-draft releases checked with `gh release view` on September 7:

| Repository | Latest release reported | Published UTC | Source reviewed |
|---|---|---|---|
| [Watchdog](https://github.com/kujolang/watchdog/releases/tag/v1.0.1) | v1.0.1 | 2026-08-11 17:15:49 | `557b822`, September 6 |
| [Agents SDK](https://github.com/kujolang/agents-sdk/releases/tag/v1.0.0) | v1.0.0 | 2026-08-08 07:01:44 | `e0be75b`, September 6 |
| [Dispatch](https://github.com/kujolang/dispatch/releases/tag/v1.2.0) | v1.2.0 | 2026-08-27 12:34:37 | `83eea7d`, September 6 |
| [Relay](https://github.com/kujolang/relay/releases/tag/v1.1.0) | v1.1.0 | 2026-08-27 13:35:01 | `01c44da`, September 1 |

These release checks do not prove that a tagged binary includes newer source. Implementation must pin reviewed commits or verify successors. Other repo badges and VERSIONs were inspected as metadata, not all independently certified as latest released binaries. Agents SDK had unrelated untracked maintenance files; no inspected tracked source modifications were required or made. The parent workspace resolves to an unrelated ancestor Git repository with many untracked projects; this pack therefore uses a new standalone Git repository and does not stage parent-workspace files.

## Claim-gap reconciliation

| Initial possibility | Evidence | Resolution |
|---|---|---|
| Need universal event gateway from scratch | Watchdog canonical feed/native adapter already exist | Reuse; City gateway is scoped projection/SSE only |
| SDK enum provides live tool stream | Tool execution path lacks named emission; result projector is post-run | Add actual lifecycle sink; make it first gate |
| Dispatch hook log is ordinary terminated JSONL | Explicit legacy no-trailing-newline append | Adapter needs complete-object-at-EOF handling |
| RunLedger can replay whole organization | Receipt fields and correlations, no full event history | Use run discovery/links, not fabricated history |
| Relay parent field provides cause | Chain validator expects previous serialized event | Preserve as predecessor, use explicit cause refs separately |
| RAG OTLP config means network export | `trace_emit` calls audit with endpoint metadata | Caller seam or explicit producer export; no assumed live subscription |
| One role catalog means persistent online agents | Catalog is static package metadata | Separate persona and execution identity/presence |
| WebGPU/Three required for polished world | 2D scene/sprite requirements, upstream renderer guidance | Pixi WebGL; reject unnecessary 3D |
| Supplied images dictate literal rendering size/assets | Reference images are dense conceptual mockups | Extract grammar; original assets and readable DOM |

## External primary-source ledger

All accessed September 7, 2026. Documentation generally lacks a single publication date; date below denotes the explicit release date if available. Library capability facts are supported by official docs. Performance figures and City architecture choices are our proposed targets/inferences, not sourced benchmark claims. NESdev is labeled specialist documentation rather than official Nintendo documentation.

| Source / publisher | Supported claim | URL / date |
|---|---|---|
| PixiJS versions / Pixi team | 8.20.0 current stable listed directly | https://pixijs.com/versions |
| PixiJS renderer guide | WebGL recommended, WebGPU caution, Canvas fallback not shipping in this guide | https://pixijs.com/8.x/guides/components/renderers |
| PixiJS performance guide | Sprite batching/sheets, text/filter and culling tradeoffs | https://pixijs.com/8.x/guides/concepts/performance-tips |
| Phaser release page / Phaser | Phaser 4.2.1 current listed, July 9 2026 | https://phaser.io/download/phaser4 |
| Phaser scenes/cameras/tilemaps | Built-in scene, camera, map features | https://docs.phaser.io/phaser/concepts/scenes ; https://docs.phaser.io/phaser/concepts/cameras ; https://docs.phaser.io/api-documentation/function/tilemaps |
| Phaser migration article | Phaser 4 renderer/pipeline changes matter for old shader examples | https://phaser.io/news/2026/05/phaser-3-vs-phaser-4 |
| Three.js official docs | WebGL2 renderer and separate WebGPU material path | https://threejs.org/docs/pages/WebGLRenderer.html ; https://threejs.org/manual/en/webgpurenderer |
| MDN Canvas / Mozilla contributors | Integer coordinates, caching reusable drawings | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas |
| Tiled official docs/source | Object properties and JSON authoring format | https://doc.mapeditor.org/en/stable/manual/custom-properties/ ; https://github.com/mapeditor/tiled/blob/master/docs/reference/json-map-format.rst |
| LDtk official schema/docs | Typed levels/entities alternative importer | https://ldtk.io/json/ |
| Aseprite official CLI | Batch sheets, layer/tag export and metadata | https://www.aseprite.org/docs/cli/ |
| WHATWG HTML standard | EventSource stream/reconnect contract | https://html.spec.whatwg.org/multipage/server-sent-events.html |
| MDN SSE/WebSocket | EventSource use and WebSocket backpressure limitation | https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events ; https://developer.mozilla.org/en-US/docs/Web/API/WebSocket |
| MDN Web Audio | User gesture/audio lifecycle practices | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices |
| Glenn Fiedler original engineering essay | Fixed ticks and catch-up overload, not cross-browser integer guarantee | https://gafferongames.com/post/fix_your_timestep/ |
| AI Town original architecture / a16z-infra | Engine/game/client separation and historical motion | https://github.com/a16z-infra/ai-town/blob/main/ARCHITECTURE.md |
| WorkAdventure official map docs | Tiled semantic maps and location-related content | https://docs.workadventu.re/map-building/tiled-editor/wa-maps/ ; https://docs.workadventu.re/map-building/tiled-editor/website-in-map/ |
| Gource project | Version-control history as spatial animation | https://gource.io/ |
| Temporal original engineering guidance | Deterministic execution against recorded history | https://assets.temporal.io/w/ensuring-deterministic-execution.pdf |
| NESdev specialist hardware documentation | PPU resolution/patterns/sprites/palettes | https://www.nesdev.org/wiki/PPU_rendering ; https://www.nesdev.org/wiki/PPU_programmer_reference ; https://www.nesdev.org/wiki/PPU_palettes |

Research source limitations: one attempted direct Phaser version-specific URL was inaccessible; the official Phaser 4 release listing supplies the version instead. Search-indexed Pixi release summaries lagged behind the directly inspected versions page; use the latter. No benchmark bundle or source-renderer compatibility POC was required/performed. External citations support capabilities, not validation of an unbuilt City implementation.

## Supplied visual inputs

The five user-provided attachments were visible and inspected in the conversation: `Photo 1.jpg` / `1-Photo-1.jpg` (HQ interface), `Photo 2.jpg` / `2-Photo-2.jpg` (overworld), `Photo 3.jpg` / `3-Photo-3.jpg` (side-view modules), `Photo 4.jpg` / `4-Photo-4.jpg` (meeting), `Photo 5.jpg` / `5-Photo-5.jpg` (Library). Their temporary attachment paths are not stable handoff dependencies; the report preserves the technical interpretation. No image generation, editing, tracing or redistribution was performed.

## Immutable source links

The appendix below is generated from the verified local source paths and inventory HEADs. These links provide repository/commit provenance for the path/symbol ledger above; they do not imply that every URL was independently fetched from GitHub. `source-index.json` also records local SHA-256 for reproducible evidence comparison.

- [agents-sdk/src/agents/core_types.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/core_types.kujo)
- [agents-sdk/src/agents/events.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/events.kujo)
- [agents-sdk/src/agents/runner.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/runner.kujo)
- [agents-sdk/src/agents/runtime/clock_ids.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/runtime/clock_ids.kujo)
- [agents-sdk/src/agents/tracing/watchdog.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/tracing/watchdog.kujo)
- [agents-sdk/src/agents/retrieval/rag_adapter.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/retrieval/rag_adapter.kujo)
- [agents-sdk/src/agents/handoffs/handoff.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/handoffs/handoff.kujo)
- [agents-sdk/examples/rag_documentation_agent.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/examples/rag_documentation_agent.kujo)
- [agents-sdk/tests/runner_result_event_contract_tests.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/tests/runner_result_event_contract_tests.kujo)
- [agents-sdk/tests/arch_runtime_clock_ids_tests.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/tests/arch_runtime_clock_ids_tests.kujo)
- [agents-sdk/tests/watchdog_telemetry_contract_tests.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/tests/watchdog_telemetry_contract_tests.kujo)
- [agents-sdk/tests/handoff_contract_tests.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/tests/handoff_contract_tests.kujo)
- [kujo-agents/agent-registry.json](https://github.com/kujolang/kujo-agents/blob/65f23b8ee8fc535e3d929860742020976b121d43/agent-registry.json)
- [kujo-agents/chain-of-command/general-commander/manifest.json](https://github.com/kujolang/kujo-agents/blob/65f23b8ee8fc535e3d929860742020976b121d43/chain-of-command/general-commander/manifest.json)
- [dispatch/src/core/step.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/src/core/step.kujo)
- [dispatch/src/agents/agent.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/src/agents/agent.kujo)
- [dispatch/src/core/runner.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/src/core/runner.kujo)
- [dispatch/src/core/hooks.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/src/core/hooks.kujo)
- [dispatch/src/core/trace.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/src/core/trace.kujo)
- [dispatch/examples/workflows/documentation-query.json](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/examples/workflows/documentation-query.json)
- [dispatch/tests/dispatch_tests.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/tests/dispatch_tests.kujo)
- [dispatch/tests/operational_controls_tests.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/tests/operational_controls_tests.kujo)
- [dispatch/tests/hardening_tests.kujo](https://github.com/kujolang/dispatch/blob/83eea7d9d9c2a8c125bee8d64b13c1181f60c609/tests/hardening_tests.kujo)
- [relay/src/runtime.kujo](https://github.com/kujolang/relay/blob/01c44da192e0fa7f1135d3c047b16dd23421058d/src/runtime.kujo)
- [relay/src/contracts.kujo](https://github.com/kujolang/relay/blob/01c44da192e0fa7f1135d3c047b16dd23421058d/src/contracts.kujo)
- [relay/src/cli.kujo](https://github.com/kujolang/relay/blob/01c44da192e0fa7f1135d3c047b16dd23421058d/src/cli.kujo)
- [relay/src/common.kujo](https://github.com/kujolang/relay/blob/01c44da192e0fa7f1135d3c047b16dd23421058d/src/common.kujo)
- [relay/src/registry.kujo](https://github.com/kujolang/relay/blob/01c44da192e0fa7f1135d3c047b16dd23421058d/src/registry.kujo)
- [workcell/src/receipts/receipt.kujo](https://github.com/kujolang/workcell/blob/af0665423417a0872303e69b7c22777c697361bb/src/receipts/receipt.kujo)
- [workcell/src/receipts/v2.kujo](https://github.com/kujolang/workcell/blob/af0665423417a0872303e69b7c22777c697361bb/src/receipts/v2.kujo)
- [workcell/src/domain/caller_context.kujo](https://github.com/kujolang/workcell/blob/af0665423417a0872303e69b7c22777c697361bb/src/domain/caller_context.kujo)
- [workcell-studio/docs/ARCHITECTURE.md](https://github.com/kujolang/workcell-studio/blob/e5f82f23eebaded5254ef586b37243559042106d/docs/ARCHITECTURE.md)
- [watchdog/docs/native-event-contract.md](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/docs/native-event-contract.md)
- [watchdog/schemas/watchdog-native-event-v1.schema.json](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/schemas/watchdog-native-event-v1.schema.json)
- [watchdog/schemas/telemetry-v2.schema.json](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/schemas/telemetry-v2.schema.json)
- [watchdog/src/telemetry_native_adapter.kujo](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/src/telemetry_native_adapter.kujo)
- [watchdog/src/telemetry_repository.kujo](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/src/telemetry_repository.kujo)
- [watchdog/src/dashboard_server.kujo](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/src/dashboard_server.kujo)
- [watchdog/tests/telemetry_native_adapter_check.js](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/tests/telemetry_native_adapter_check.js)
- [watchdog/tests/telemetry_v2_identity_conflict_suite.js](https://github.com/kujolang/watchdog/blob/557b822294e70bfd4f42e1751fde5652f932c34c/tests/telemetry_v2_identity_conflict_suite.js)
- [runledger/src/record.kujo](https://github.com/kujolang/runledger/blob/92cb06344386fc0a78d92b1db92f417edb22b285/src/record.kujo)
- [rag/src/query_api.kujo](https://github.com/kujolang/rag/blob/85743f88c152d7c65f59d4697111faf85e36d8eb/src/query_api.kujo)
- [rag/src/audit_log.kujo](https://github.com/kujolang/rag/blob/85743f88c152d7c65f59d4697111faf85e36d8eb/src/audit_log.kujo)
- [rag/src/retrieval.kujo](https://github.com/kujolang/rag/blob/85743f88c152d7c65f59d4697111faf85e36d8eb/src/retrieval.kujo)
- [rag/src/rag_engine.kujo](https://github.com/kujolang/rag/blob/85743f88c152d7c65f59d4697111faf85e36d8eb/src/rag_engine.kujo)
- [rag/openapi/kujo-rag-openapi.json](https://github.com/kujolang/rag/blob/85743f88c152d7c65f59d4697111faf85e36d8eb/openapi/kujo-rag-openapi.json)
- [eval/src/watchdog_telemetry.kujo](https://github.com/kujolang/eval/blob/7ad5caef1b718ab8a6ccdd02ef1b645af93ac133/src/watchdog_telemetry.kujo)
- [eval/tests/watchdog_telemetry_tests.kujo](https://github.com/kujolang/eval/blob/7ad5caef1b718ab8a6ccdd02ef1b645af93ac133/tests/watchdog_telemetry_tests.kujo)
- [mcp/src/telemetry/watchdog.kujo](https://github.com/kujolang/mcp/blob/20f1c83f702aa0a86595db5a824634c1dde96aaa/src/telemetry/watchdog.kujo)
- [mcp/src/abilities/projection.kujo](https://github.com/kujolang/mcp/blob/20f1c83f702aa0a86595db5a824634c1dde96aaa/src/abilities/projection.kujo)
- [mcp/src/abilities/gateway.kujo](https://github.com/kujolang/mcp/blob/20f1c83f702aa0a86595db5a824634c1dde96aaa/src/abilities/gateway.kujo)
- [agents-sdk/src/agents/abilities/contract.kujo](https://github.com/kujolang/agents-sdk/blob/e0be75bb153296e0d2e93c7b4608a90abcb6f60e/src/agents/abilities/contract.kujo)
- [ability/src/contracts.kujo](https://github.com/kujolang/ability/blob/e5a74803c822de79e934d2bea82d615d8be3bbee/src/contracts.kujo)
- [ability/src/runtime.kujo](https://github.com/kujolang/ability/blob/e5a74803c822de79e934d2bea82d615d8be3bbee/src/runtime.kujo)
- [ability-gateway/README.md](https://github.com/kujolang/ability-gateway/blob/d7934e267826aba2525c042e56cc6e74a460e547/README.md)
- [ai-chat/lib/execution-journal.js](https://github.com/kujolang/ai-chat/blob/18e8667505d79f72a96f0589c4e9160af6f7b944/lib/execution-journal.js)
- [ai-chat/public/execution-replay.js](https://github.com/kujolang/ai-chat/blob/18e8667505d79f72a96f0589c4e9160af6f7b944/public/execution-replay.js)
- [ai-chat/tests/execution-replay.test.js](https://github.com/kujolang/ai-chat/blob/18e8667505d79f72a96f0589c4e9160af6f7b944/tests/execution-replay.test.js)
- [searchbridge/src/telemetry.kujo](https://github.com/kujolang/searchbridge/blob/88aad1c0eacf2588dac305beb18eb0a3adbb53e2/src/telemetry.kujo)
- [shipcheck/src/report.kujo](https://github.com/kujolang/shipcheck/blob/111bfc83c832050877cb9d4fd82908aaf6d14749/src/report.kujo)
- [shipcheck/schemas/shipcheck-report.schema.json](https://github.com/kujolang/shipcheck/blob/111bfc83c832050877cb9d4fd82908aaf6d14749/schemas/shipcheck-report.schema.json)
- [casefile/src/capture.kujo](https://github.com/kujolang/casefile/blob/f26df300df0e9db570f7730341077084f5594f0d/src/capture.kujo)
- [casefile/src/redactor.kujo](https://github.com/kujolang/casefile/blob/f26df300df0e9db570f7730341077084f5594f0d/src/redactor.kujo)
- [site-kit/components/modal/modal.html](https://github.com/kujolang/site-kit/blob/9629c4cb2a42f62f80be6159c9d63a141ccbb696/components/modal/modal.html)
- [leash/contracts/event.schema.json](https://github.com/robertdevore/leash/blob/3e90f14b7abc6c23a89157fbd7cc98c6d4dbfcf8/contracts/event.schema.json)
- [kujo/README.md](https://github.com/kujolang/kujo/blob/5dcbfcda2e48c2fe56dd2a4ecdb2d5947e18ff59/README.md)
- [ai-sdk/README.md](https://github.com/kujolang/ai-sdk/blob/71bad1468fbc97eab830a27c185c032f07fd76cf/README.md)
- [kennel/README.md](https://github.com/kujolang/kennel/blob/fbef0ea0ed8b1b7eb037e45a2aa9d1a170c31b79/README.md)
- [spec/README.md](https://github.com/kujolang/spec/blob/1211f37a09314be7150734bf15a55e9b2ea6504d/README.md)
- [changebucket/README.md](https://github.com/kujolang/changebucket/blob/38d67aacee7258f3c84c2d8d8e9ae671df943c90/README.md)
- [scent/README.md](https://github.com/kujolang/scent/blob/969f0fdc853c88cd051248a6ebcd9ce0434d9f43/README.md)
- [fence/README.md](https://github.com/kujolang/fence/blob/fda049ed9aa55ba50c150b84bb9ca1bdf49af0dc/README.md)
- [muzzle/README.md](https://github.com/kujolang/muzzle/blob/ac40faf465486848509275cdd5f3af8096bbdeea/README.md)
- [howl/README.md](https://github.com/kujolang/howl/blob/2a489084b8ebe5e1192eb7fdbaa3b3e19a52600e/README.md)
- [lens/README.md](https://github.com/kujolang/lens/blob/fd388efd4f55f3f844cf7de4fc541abfd07a6785/README.md)
- [site-kit/README.md](https://github.com/kujolang/site-kit/blob/9629c4cb2a42f62f80be6159c9d63a141ccbb696/README.md)
- [ssg/README.md](https://github.com/kujolang/ssg/blob/e165dbc1b596ea759a2b9c2ff0b9ca988c333eea/README.md)
- [totalrecall/README.md](https://github.com/robertdevore/totalrecall/blob/d79b2b3c25d349a7748f3f519a7818fb748ceccc/README.md)
- [searchbridge/README.md](https://github.com/kujolang/searchbridge/blob/88aad1c0eacf2588dac305beb18eb0a3adbb53e2/README.md)
- [workcell-studio/README.md](https://github.com/kujolang/workcell-studio/blob/e5f82f23eebaded5254ef586b37243559042106d/README.md)
- [concord/README.md](https://github.com/kujolang/concord/blob/4ca511291b2c3cae2b3a2b838b2bbf03ac0b0503/README.md)
- [packwrite/README.md](https://github.com/kujolang/packwrite/blob/3f0cbf4b5052677d22040cdf486adf2817b40a20/README.md)
- [patchbrief/README.md](https://github.com/kujolang/patchbrief/blob/321d961c19c4ee09713cf1f737ba5e112b0caa5b/README.md)
