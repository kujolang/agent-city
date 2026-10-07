# Public release readiness — 2026-10-07

Status: NOT READY for general public production release. Local preview works.
Source checkpoint: bf80bb6c59fd79d76daa31d5c1a3c8f569a95bcd.

## Installer and qualification

The isolated installer pins six producer revisions and Kujo runtime 1.7.0.
A fresh isolated dependency installation and production build succeeded locally;
the installed mission-contract harness passed using a synthetic model provider
and actual SDK/Dispatch/RAG/MCP integration. This is not fresh real-model proof.
The full verification log records 57 tests across 18 files, types, boundaries,
maps and build passing. Local logs: .runtime/installer-verify.log and
.runtime/fresh-install-20261007/agent-city/.runtime-install-contract.log.

The unsupported-Node bootstrap downloaded and verified private Node 24.21.0,
but failed to download Agent City anonymously: GitHub confirms the repository
is private, and its anonymous codeload URL returns 404. No public one-liner is
qualified. Publication/distribution must be reviewed; changing repository
visibility would expose its history and has not been performed.

All four clean-platform jobs were rejected before any steps ran due to GitHub
account payment/spending limits. They are unqualified, not platform test failures.
Run: https://github.com/kujolang/agent-city/actions/runs/37660245143
Annotation: check-run 112925612159. The account owner must resolve billing or
provide an alternative qualified runner environment. Update/uninstall remain open.

## Bounded telemetry measurement

See pipeline.json: 14,800 synthetic canonical observations reached the real
Watchdog → gateway → SSE path with zero missing or duplicate events, at
164.156 observations/second over 90.158 seconds. The send safety cap stopped
the offered 1,100/second workload after 90 seconds. The required sustained
1,000/second for 60 seconds is NOT met. This harness mode uses an SSE consumer,
not a browser-rendering benchmark. System contention may affect the measurement;
no isolated-system capacity or root cause is established. No eight-hour soak ran.

## Remaining scope

RELEASE-CHECKLIST.md remains authoritative and unchecked: public installation,
onboarding, custom catalog teams/skills/workflows, broader authorized real work,
reliability qualification, and visual/release packaging acceptance. Six authored
rooms cover Dispatch, Workshop, Library, MCP, Meeting and Dojo. More buildings
are not a substitute for supported capabilities; Archive/Watchdog can remain
read-only evidence surfaces unless a new semantic location is justified.

## Managed update/uninstall follow-up

`installer/lifecycle.mjs` adds exclusive managed-startup/maintenance leases, staged
updates with full retained rollback archives, and archive-based uninstall. The
real locally installed app was updated from pinned dependencies, served HTTP 200,
refused uninstall while active, stopped gracefully, then uninstalled to an archive.
All 105 prior `.runtime` files remained byte-identical. See maintenance.json.
The final lease-path canonicalization/private-Node validation refinements passed
seven focused tests and typecheck after the real update exercise; the broader
verification passed 61 tests plus build/maps/boundaries before those refinements.
This does not qualify public bootstrap, other platforms, or the complete checklist.
