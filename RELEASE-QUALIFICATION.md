# Local release qualification — 2026-10-08

**CONDITIONAL: usable public local preview, not unrestricted production certification.**
The repository is public and GitHub Actions executes successfully. Immutable
local-preview release v0.2.0-rc.2 is published (see the follow-through receipts below).
No public service deployment, multi-tenant hosting or eight-hour soak is claimed.
The long soak was explicitly cancelled; do not start or schedule it without renewed consent.

## Next version review — 0.2.0-rc.3

The [rc.3 evidence](evidence/release-rc3/README.md) qualifies code commit `5e6c973`:
all five CI jobs pass, including installation on four platforms. Selected WebOps
reporting is live-proven. The combined VideoOps browser launch now reaches a real
rendered candidate and technical PASS, with all 27 observations visible through
the scoped gateway. Human approval/finalization of that exact candidate remains
pending. A GitHub draft holds pinned artifacts; it is not a published version.
Docker engines without required seccomp/AppArmor are rejected before model work.
No eight-hour soak was performed. Older measurements below retain their dated scope.

## Working capability and live sources

A pinned one-command managed installer supplies compatible Kujo runtime/producers,
private Node, startup/preflight, staged updates and archive uninstall. Linux x64/ARM64
and macOS Intel/ARM installation are CI-covered. Ollama listing/setup and the existing
Codex subscription text connector work; users supply their own provider/account.
The isolated installer never assumes a pre-saved API key or silently chooses a provider.

The separate local Mission Command accepts explicit writing/code work and bounded
reviewer handoffs.85profiles import; eligible profiles may execute the supported
PROPOSE contracts. Explicit permission enables metadata/docs/source MCP reads,
selected project inputs, isolated Workcell execution, named output exports and
user-specified checks. Arbitrary imported workflow references/Ability tools do not
become executable merely because their profile appears in the catalog.

Observer displays source-qualified SDK runs, RAG retrieval, actual MCP calls,
handoffs, Dispatch task state, artifacts, Workcell receipts and Eval checks.
Six authored buildings/interiors, deterministic routes/portals, Follow, inspectors,
source health, current/recent truth, archive/comparison/replay and canvas recording
are implemented. Asynchronous handoff never fabricates an in-person meeting.
Local task controls are separate from the read-only projection and renderer.

## Real product proof

[The useful release-notes tool and game-only video](evidence/reviewed-release-tool/README.md)
use actual Codex author/reviewer, local RAG/MCP and Workcell, not a fake model.
Mission4696d158 has four real execution instances, valid Kujo, exit0, verified
cleanup, actual named Markdown export and passed exact stdout. Earlier failed and
unverified attempts remain retained. The reviewer A grade is explicitly model opinion.
The53.05second recording starts in Workshop and covers city, Library, MCP and Dojo.

The final audit fixed two observed defects: nested project-export references no
longer become schema gaps, and reload Follow uses the exact active operation state.
The original recorded gap is retained; its exact canonical record passes the new
regression without changing the old journal. Unknown aggregate workflow/presence
and missing lifecycle coverage remain UNKNOWN/partial. No inferred completion.

## Verification and evidence scope

| Gate | Evidence / result |
| --- | --- |
| Source build |112tests, TypeScript, pure-world boundaries, seven reciprocal maps and Vite build pass after final fixes |
| Public installation |CI37745860221 atca86be9: all5jobs, including four installed platforms; final follow/reference fix CI37749479661 atdd42cc4 also passes all5jobs |
| First-user live task |[Fresh managed install](evidence/first-user-current/README.md), existing authenticated Ollama reused; new provider-account signup not claimed |
| Custom work |[Publishing House](evidence/publishing-house/README.md), [custom code](evidence/profile-code/README.md), [Kujo](evidence/profile-kujo/README.md), final real tool above |
| Failure/pass history |[Real output check repair](evidence/mission-workcell/output-check-real/README.md), final tool's retained failed/unverified attempts |
| Reference/motion |[Five-reference assessment](evidence/game-view/REFERENCE-ACCEPTANCE.md), original artwork and actual populated video; disclosed density differences, no pixel-identical/user-approved claim |
| Reload identity |[Controlled active/completed/ambiguous reload](evidence/follow-reload/README.md); no source writes |
| Replay |77event real-session normalized redacted bundle replayed twice identically; hash in tool evidence. Pinned map/core/schema; partial coverage preserved; no source execution |
| Native ShipCheck |`scan` and `gate --dir agent-city --format json`: exit0,13/16,0errors,3warnings (lint command, optional Kennel manifest/Kujo entrypoint in this TypeScript application). Metadata readiness only |
| Package |[Current preview manifest, hashes, source pins, doctor and controlled contract](evidence/release-package-refresh/README.md); not a signed published binary release |

## Measured performance and stress

[Independent Linux Chromium153/SwiftShader profiles](evidence/performance-current/37741814069/renderer.json):
25instances frame p50/p95 16.7/16.7ms, draw p50/p95 1.0/1.7ms.5/100/500 frame p95
16.8/16.7/16.8ms. At100/500 only selected/followed actors remain detailed; semantic
state, actor reuse/offscreen sleep/selection remain correct. This is bounded, not a
universal FPS guarantee. The local Intel UHD630/ANGLE Metal backend also takes51.5ms
p95 for bare WebGL; no speculative renderer optimization or default browser override ships.

Actual four-instance inspector:24selections, p50/p95 17.6/70.5ms to next-frame DOM
identity, unchanged truth. Actual session producer-occurrence→gateway observation
p50/p95 447/686ms across76timed events (max1013ms), including source/bridge/polling.
This is separate from click latency. **Per-event upstream→paint latency is not fully
instrumented**; these two measurements must not be added and advertised as that metric.
Initial payload upper bound:240,603gzip bytes for all emitted JS including lazy
fallbacks,15,137gzip visual bytes,1,720,320decoded PNG RGBA bytes. This excludes GPU
buffers/driver memory and is not total texture allocation. [Method and provenance](evidence/performance-current/README.md).

[Canonical stress with reconnect](evidence/reconnect-load/37717824495/x64.json):
66,000accepted/visible, zero missing/duplicate events, no uncertain batches,
64.10seconds sending,1,023.26gateway events/sec and1,017.51browser events/sec,
two actual offline/online recoveries; final browser order66,000. Intake p50/p95
378.23/559.98ms, post-send browser catch-up322.50ms. Synthetic stress is separate
from real product proof. Direct journal and Linux ARM receipts are retained separately.
During the bounded x64 sample, journal grew4,096→75,776,000bytes and sampled browser
heap16.0→54.2MB; raw CPU/RSS process-tree samples are retained. This is active workload
growth, not proof of a memory leak or of long-term stability. Queues remain bounded;
source gaps/conflicts are surfaced rather than silently discarded.

## Reliability, accessibility and privacy

Historical bounded soak was180.17seconds over retained journal/health polling,
not eight hours and not sustained new producer work. GPU allocation was unavailable.
No eight-hour test was run or scheduled. Long-duration memory, OS sleep/tab discard
and source recovery remain unqualified.

[Recorded hardening matrix](evidence/blockers/release-gates.json) is CONDITIONAL:
DPR1/1.25/2,320px, keyboard, reduced motion, native browser zoom, renderer-init fallback,
observed context loss/restoration, short native hidden-tab recovery, gateway stopped
while source finishes, cursor/store-epoch and reconnect checks. Historical browser
results are revision-stamped; current CI reruns onboarding, layout/fallback,
continuation and reload checks. No Safari/Firefox/mobile certification is claimed.

Security regressions enforce loopback/authenticated local controls, private provider
credentials, workspace quarantine, bounded metadata-only telemetry, explicit source/
project permissions, evidence authorization, traversal/symlink rejection, attempt
identity, malformed/conflicting event failure, replay isolation and ungranted tool-call
rejection. Raw prompts/RAG/chat are not broadcast in SSE. Authorized local conversation
and artifact stores intentionally contain task content; the demo's separately published
content is nonsecret user-requested proof. This is tested local hardening, not an
independent penetration-test attestation or authorization for public hosting.

## Remaining risks and next phase

1. Long-duration reliability remains NOT_QUALIFIED after the user's cancellation.
2. The local Intel/Metal backend slowdown is reproducible outside City; broad GPU
   performance and per-event upstream-to-paint latency still need qualification.
3. Model quality is variable: small/local and cloud attempts failed honestly. Profile
   import is broader than executable adapters; arbitrary team workflows are unsupported.
4. Visual direction is implemented with original assets, but the city is simpler and
   less textured than the high-resolution concept pack. No final user art approval assumed.
5. Distribution is a public managed preview. Artifact hashes establish integrity;
   publisher signing/attestation is not claimed or treated as an invented mandatory gate.

Promote as a **local preview for explicit supported workflows**, with the limits above.
Recommended next phase is **Phase3 replay/debugging polish and bounded qualification**,
not Director Mode or public multi-tenant hosting. Do not silently restart the cancelled
soak. Owned proof services and dedicated Colima were stopped; user Ollama and default
Docker context were preserved. RunLedger correlation and Strata handoff retain exact
source/evidence identifiers.

## Release follow-through checkpoint

Later work is tracked separately in RELEASE-NEXT.md; this report does not certify
an unreleased revision automatically. Saved Workcell setup and supported-account
provider onboarding now have additional receipts. Current local verification is
115tests plus types/boundaries/maps/build. CI37776849191 passes all5jobs, including
four installed platforms and measured lifecycle-to-inspector latency on Linux
x64/ARM. See evidence/runtime-latency and evidence/codex-onboarding for exact scope.
The prior uninstrumented latency limitation is superseded for those bounded samples.
Exact per-tab execution selection now survives completion/reload, and native
hidden/discard/resume has a local passing receipt with test-harness failures retained.
Independent qualification of the new native harness and the versioned release remain
open. WebOps28/VideoOps6 profiles currently require unconnected capabilities; their
catalog presence is not executable team support. No eight-hour soak was run.

Independent follow-through CI37778943244 atc98277c now passes all5jobs and includes
native Linux hidden/discard/resume evidence, alongside the local pass. The bounded
recovery/performance workstream is closed within that measured scope. The versioned
public release and selected executable team adapters remain open.

Public distribution follow-through: v0.2.0-rc.2 is now published as an immutable
local preview, source6d550705. Exact installer and anonymous asset hashes pass;
CI37780321588 all5jobs PASS. See evidence/public-release/rc2. Earlier statements
that no release/tag exists describe the previous milestone and are superseded
by this release receipt. Executable WebOps/VideoOps team adapters remain open.

## Current development qualification after VideoOps acceptance work

The public rc.2 remains immutable. Current development main adds saved VideoOps
setup, bounded production stages, explicit human review/finalize controls and
selected WebOps reporting. See [workflow support](docs/workflow-support.md).

Full local verification at aa93ecb passes147tests, TypeScript, pure-world
boundaries, seven reciprocal maps and build. [Actual repaired VideoOps output](evidence/videoops-render/37802468455/README.md)
passes isolated check/render/probe/decode and exact downloaded checksum. The first
Editor attempt's named-font failure remains recorded; attempt2 is separate.
This is staged real-model plus isolated-CI proof, not complete Mission Command
production-launch acceptance. Canonical perceptual status is NOT_REVIEWED.

Release blockers for these additions: combined production launch, exact-video
human review and finalization, then qualification/publication of a new immutable
version. Local Docker recovery is pending operator coordination because a restart
can interrupt other workloads. No approval, source completion or release readiness
is inferred from the green technical checks. No eight-hour soak is required now.
