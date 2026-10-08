> Historical checkpoint. Public distribution, four-platform installation,
> first-user onboarding and canonical throughput have newer passing evidence.
> Current recorded hardening status is **CONDITIONAL**, with the user-cancelled
> soak unqualified: [assessment](../blockers/release-gates.json).
> See [current checklist](../../RELEASE-CHECKLIST.md) and
> [current bounded performance](../performance-current/README.md).
> The unchecked items below describe the older checkpoint, not current blockers.

# Release work checkpoint — incomplete

Release status: FAIL. The five requested items are not all complete; no production release or final tool-building video has been published or claimed.

1. Recovery: explicit ownership-scoped stopped-Workcell cleanup is implemented and proved. Automatic mission reconciliation, UNKNOWN admission recovery and launcher crash recovery remain open.
2. Installation/onboarding: clean Linux AMD64 container install and installed mission contracts pass. Full fresh-user model/sandbox onboarding and Mac/ARM CI qualification remain open. CI run37691817210 was rejected before steps for billing/spending limits.
3. Acceptance workflows: earlier real writing, custom author/reviewer and Kujo execution evidence remains. No new clean-user three-workflow acceptance run was made in this checkpoint.
4. Reliability/security/visuals: current bounded canonical Watchdog→gateway/SSE run delivered26,200/26,200, zero observed losses/duplicates, at285.199 events/s over91.866seconds. It failed the1,000events/s target. This run did not measure browser convergence. Four previously recorded optional cloud-adapter audit findings and reference-art acceptance remain open. Eight-hour soak remains cancelled.
5. Distribution/release: corrected pinned macOS x64 preview bundle passes integrity checks; private repository still blocks anonymous bootstrap. Local ShipCheck metadata gate passes11/16 with5warnings, which is not product release approval. Connected ShipCheck was unavailable (MCP transport404). No remote visibility/release mutations occurred.

The initial stress invocation used concurrency8, beyond the harness maximum4, and was rejected before load. The corrected concurrency4 run is pipeline.json. No gate was relaxed. Host load can affect measurements; it does not qualify the failed gate. Dedicated owned container services/VM were stopped and unrelated repository edits retained.

Next: finish source-aware mission recovery and fresh-user onboarding while CI billing is resolved; profile the canonical intake bottleneck. The requested real usable Kujo tool and game-only recording remain queued after the five release items, as requested.
