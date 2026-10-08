# Requested release follow-through

Scope from the user's “do those things now” request, 2026-10-08. Keep all five
workstreams open until their actual evidence exists. No eight-hour soak is authorized.

- [x] Versioned public release: immutable tag/release notes, supported platforms,
      pinned installation and verified release artifacts. Publish only after the
      changes are concrete and verified; no claim of universal workflow support.
- [x] Easier Workcell setup: explicit one-command image setup, persisted immutable
      image/context, normal restart, clear disable/recovery path, per-task consent.
- [x] First-time provider onboarding: absent/missing/authentication/model faults,
      useful recovery guidance, real fresh-configuration task where credentials
      already authorize it. Never create accounts or invent authentication proof.
- [x] Bounded reliability/performance: graphics slowdown diagnosis, actual
      operation-to-visible timing, tab discard/suspension and recovery. No long soak.
- [ ] Explicit workflow support: user-facing executable-vs-imported capability
      matrix; selected VideoOps/WebOps/publishing acceptance and adapters where
      needed for promised workflows. A catalog import alone is not execution proof.

Evidence from the preceding milestone remains in RELEASE-QUALIFICATION.md and
its linked receipts. It does not automatically qualify new changes. Preserve real
failed attempts, source independence, unknown truth and pure world-core boundaries.

2026-10-08 setup implementation: explicit saved immutable image/context, private
atomic settings, runtime-specific UI command, normal-launch loading and disable
path implemented. Actual selected Docker image passed enable→normal restart→
read-only availability check→disable→restart with zero tasks/providers invoked.
`evidence/saved-workcell/proof.json` records the result; installed Linux CI now
uses `--build --enable` and consumes saved settings for actual Workcell execution.
This item stays open until that expanded installed-platform CI completes.

Saved setup qualification: CI37773200210 at054e6bc passes all5jobs, including
actual installed Linuxx64/ARM container work using saved settings; four platforms
install successfully. This closes item2. Completion-to-visible instrumentation
now measures19actual terminal observations from5Dispatch/SDK/local RAG runs:
p50/p95 upstream544/778ms and SSE-to-visible44/76ms in isolated SwiftShader.
See evidence/runtime-latency. Native discard/suspension work remains open.

Reload recovery now retains exact per-tab selected execution and Follow preference;
completed truth stays inspectable without continuing Follow. Six controlled reload
cases pass with unchanged truth and zero source writes. Native tab discard remains
unqualified: the attached-browser harness crashes Chromium151/153 during discard.
Codex onboarding now checks CLI/options/login and supports authenticated alias
listing; seven controlled readiness states and the actual local connector metadata
proof pass. Fresh-user generation/remaining provider qualification stays open.

CI37776849191 at90478e5 passes115tests and all four installed platforms. Linux
x64/ARM latency receipts now qualify the measured completion→DOM opportunity
path independently (20 observations each; p95 upstream580/450ms, SSE55/48ms,
zero unpainted selected). The prior ARM failure was a missing test-browser install,
corrected in the workflow. Workflow reference labels and docs/workflow-support.md
now distinguish executable adapters from catalog declarations; team production
acceptance remains open, not inferred from the matrix.

Provider onboarding qualification: seven controlled Codex readiness states, current
CI provider setup faults, retained real fresh installed Ollama task and new real
fresh City/Codex task mission19c5a835 cover the supported existing-account paths.
The connector now follows the normal launcher default5178 and CITY_PORT_OFFSET;
its authenticated alias listing passes from the UI and a real SDK author/reviewer
result was saved. See evidence/codex-onboarding. No new provider-account signup or
unknown underlying model identity is claimed.

Bounded recovery/performance qualified: CI37778943244 atc98277c passes all5jobs
and four installed platforms. Its actual Linux native-discard receipt matches the
local pass: hidden tab, native discarded document, authoritative failed snapshot,
exact selected identity, reconstructed renderer, zero source writes. See
evidence/browser-discard/37778943244/linux.json. This closes the bounded gate;
no OS sleep, long soak or universal GPU guarantee is claimed. Versioned release
and selected team workflow adapters/acceptance remain open.

Versioned distribution closed for the explicit local-preview scope: public immutable
v0.2.0-rc.2 at6d550705, release406832650. All4assets hash-match before publication
and through anonymous public download. Exact pinned installer passed fresh local
installation/doctor; CI37780321588 all5jobs/four platforms PASS. Evidence is under
evidence/public-release/rc2. This does not close selected team adapters or make
a blanket production-readiness claim.

WebOps implementation checkpoint: supplied-evidence Reporter → Copy Chief adapter,
strict report-reference checks and observed check lifecycle are implemented. Mission
Command now has an explicit evidence form, disables unrelated tool/profile controls,
and exposes failed report artifacts and JSON downloads. Controlled browser submission,
invalid-JSON rejection and failed-report inspection pass; 120 unit tests plus
types/boundaries/maps/build pass. This is not real provider acceptance: WebOps live
author/reviewer/check proof and selected VideoOps integration remain required.

WebOps selected acceptance now passes on development main: missionfaa7442d uses
the actual WebOps Reporter and separate Copy Chief via Codex, then a deterministic
report check. Fourteen canonical/normalized events reach the gateway, including
handoff and check start/finish across three execution instances. See
evidence/webops-live. This qualifies supplied-evidence reporting only, not site
crawling or every WebOps profile. Selected VideoOps integration/acceptance and
release qualification of these additions remain open.

VideoOps foundation checkpoint: role-owned immutable artifact attempts and a bounded
adapter to canonical offline media/review inspections are implemented. The actual
native doctor finds FFmpeg/ffprobe; no candidate means review unavailable, not PASS.
124 tests/types/boundaries/maps/build pass. See evidence/videoops-foundation.
Stage orchestration, isolated render, exact-candidate independent review, UI and
real production acceptance remain open; these foundations do not close item5.

VideoOps SDK checkpoint: bounded single-stage execution now uses the actual Kujo
SDK lifecycle seam with exact role/capability admission and immutable attempt
storage. Controlled provider proof observes start before completion, rejects
duplicate attempts before another model call, and preserves malformed/tool-request
failures. Full stage handoff validation, production orchestration/render/review,
UI and real production acceptance remain open. See evidence/videoops-stage-contract.

VideoOps preparation checkpoint: planner/scout execution is now connected through
upstream schema gates, exact frame coverage, reciprocal asset mappings, immutable
attempt verification and a source-qualified file handoff. Deterministic failures
permit one targeted stage repair; uncertain provider executions do not retry.
Scout claims alone cannot establish acquired bytes or usage rights. Controlled
orchestration tests pass; this is not live production acceptance. See
evidence/videoops-preparation. Rendering, independent review, UI/live proof and
release qualification remain open.

VideoOps render adapter qualified: CI37788990120 at60537e9 builds the pinned
HyperFrames0.8.141 image and executes a real offline Workcell fixture. Check,
render, FFprobe and full decode pass; exported3second640×360/30fps MP4 hash matches
the completed/cleaned Workcell receipt. See evidence/videoops-render. Local image
build avoided because host disk remains constrained. This closes isolated renderer
mechanics, not real model production or perceptual approval. Editor integration,
review, UI/live proof and new-release qualification remain open.

Saved Editor render connection: runtime now rechecks immutable stage bytes before
rendering, reserves a fresh invocation, executes the existing offline Workcell,
revalidates exported receipts/hashes and binds the exact draft to its Editor
attempt. Changed/symlinked inputs, missing evidence and uncertain execution never
become an approved candidate or automatic retry. The real render qualification
harness now exercises this path. Full verification passes136tests; its new CI run
must still qualify the connection. Model-driven Editor orchestration, independent
review, UI/live proof and new-release qualification remain open.

Saved Editor connection independently qualifies in CI37790787619 at0634b8c;
exported candidate checksum verified after download. Canonical review handoff now
copies only rechecked candidate bytes/evidence into an exclusive private workspace,
records the successful Workcell attempt and technical-only decision, and requires
REVIEW_INCOMPLETE pending perceptual review. No automatic approval or promotion.
137tests/types/boundaries/maps/build pass. Expanded native review CI remains pending;
model Editor orchestration, independent perceptual review, UI/live proof and the
new release remain required.

Canonical exact-candidate review handoff qualifies in CI37791483497 at9ad0be4.
The actual native ledger retains one render attempt, technical PASS and perceptual
NOT_REVIEWED, with the downloaded video checksum independently matching review.
Production coordination now connects validated preparation → actual SDK Editor →
isolated render → canonical review. Three controlled coordinator tests cover
review-pending output, unsupported acquired-media transport, uncertain model execution,
source-qualified handoff attempt identity and invocation reuse denial.140tests plus
types/boundaries/maps/build pass. This is integration code, not live model production
acceptance. Acquired binary-media transport remains explicitly unavailable, never
silently substituted. UI, independent perceptual review, real production proof and
new release qualification remain open.

Acquired media transport implemented: selected Scout-resolved assets now pass a
bounded runtime byte/hash/path check before Editor execution, a private render
snapshot, and another check when copied under the isolated composition's assets
root. Explicit rights evidence remains required; no acquisition or rights approval
is inferred from Scout text. Limits:64files,16MiB each,64MiB total, supported local
media/font extensions; paths/symlinks/duplicates rejected. This supersedes the
previous transport-unavailable checkpoint.141tests/types/boundaries/maps/build
pass, including same-size hash tampering and redirected source rejection. Actual
render qualification now includes an original supplied SVG and remains pending.
Independent perceptual review, UI, real model production and release qualification
remain open; this does not establish every generation provider or media format.

Acquired-media render qualification passes CI37792840086 at e96f2d7. The actual
rendered SVG is visible in the extracted frame; source-media metadata and candidate/
review checksum linkage verified. Human review now has a Mission Command DOM panel
and token/origin-protected controls scoped to known mission IDs. Exact-candidate
checksum, explicit capability attestation, bounded notes/defects and native review
ledger decisions preserve technical/perceptual separation and failed attempts.
A controlled browser fixture passes keyboard submission and failed-review display;
143tests/types/boundaries/maps/build pass. This does not claim actual human approval.
VideoOps task intake/launch in Mission Command, actual model production, perceptual
acceptance and final output/release qualification remain open.

VideoOps mission launch now uses the existing controller admission lock and shared
supervisor lifecycle. A separate consent-bearing DOM form preserves the full request;
private operator configuration binds immutable image and exact role/capability
snapshots, never browser-provided profiles or paths. The initial launch surface
provides no external media/audio grants and blocks unsatisfied requests; the runtime
media adapter remains available for explicit acquired inputs. Provider/model setup
is reused. A rendered candidate records review-pending, never completed production;
uncertain preparation/Editor outcomes preserve UNKNOWN admission holds.145tests plus
types/boundaries/maps/build pass, WebOps browser regression passes, and controlled
VideoOps keyboard-launch/review proof passes. Operator setup UX, actual model video
production, perceptual acceptance and final-output/release qualification remain open.

Final-output implementation: an explicit authenticated finalize action checks native
APPROVED/technical PASS/perceptual PASS for the exact candidate, calls canonical
promotion only to output/final.mp4, rehashes actual final bytes and saves a separate
completion receipt. Original review-pending receipt and attempt history remain intact.
Mission reconciliation accepts completion only from that finalization evidence;
final downloads recheck native approval and actual bytes. Finalized reviews are
immutable in City; revisions require a new production.146tests/types/boundaries/maps/
build pass; controlled browser proof covers failed-review denial, explicit finalize
and final download. These are contract fixtures, not actual perceptual acceptance.
Operator setup, real model production/perceptual acceptance and new-release
qualification remain open.

Saved VideoOps operator setup implemented: setup:videoops explicitly builds/selects
an immutable image, verifies worker hash and pinned local tools in an offline bounded
container, cleans that container, and saves private role bindings and Docker context.
Model coding/structured-output/long-context capabilities require explicit operator
attestation, bound to the saved endpoint/model; no automatic model benchmark claim.
Normal launches load saved setup, explicit environment configuration takes precedence,
and disable removes only saved setup. Video render context is per-task and does not
change ordinary Kujo Workcell context.147tests/types/boundaries/maps/build pass;
actual Docker setup enable/load/disable qualification is added to the render CI and
remains pending. Live model production, perceptual acceptance and new-release
qualification remain required.

Saved VideoOps setup independently qualifies in CI37797849055 at46432ff: actual
pinned tools/worker inspection, container cleanup, private enable/load/disable,
then isolated acquired-media render/native review all pass. Setup/render image IDs
and downloaded candidate hash match. Direct CLI launches also enforce saved model
binding (8207afd, typecheck passes). This closes setup mechanics, not actual model
capability or production/perceptual acceptance. Live model proof and release
qualification remain open.

Real VideoOps preparation now passes with the existing Codex subscription alias:
run videoops-preparation-1791472748655, actual Creative Director and Asset Scout,
one attempt each. All14 canonical-backed observations recovered through the
existing spool/cursor after an observer-only restart; no model calls repeated.
The proof harness now drains observation before stopping. See
evidence/videoops-model-preparation. This qualifies preparation only; actual
Editor/render/perceptual/finalization acceptance and later release qualification
remain open. Docker Desktop was unresponsive in a bounded local check; the user's
other agent owns disk cleanup. No additional cleanup or long soak is running.

Actual SDK Editor continuation passes attempt1 using verified upstream bundles,
without repeating preparation. Eighteen normalized events retained; exact generated
composition receipt saved in evidence/videoops-model-editor. Shared Editor
instructions now serve production and qualification. TypeScript and three coordinator
regression tests pass. CI37801157457 at22b469b is rendering exact checksum-verified
model output; result pending. Perceptual review/finalization, combined launch proof
and new release qualification remain open. Local Docker still unresponsive.

CI37801157457 failed before rendering because installed packages omit development
evidence; qualification now copies exact checked-out inputs explicitly. CI37801442210
then reached Workcell wc-9c236f4e738d4bef90378aac6ee690e5 and failed with exit1,
cleanup complete. The worker dropped structured check stdout; b649dbd preserves
bounded stdout/stderr and the harness exports bounded Workcell logs. Diagnostic
CI37801961320 is active on that commit. Model output is unchanged and no approval
is claimed. The failure's precise technical cause awaits those retained logs.

Diagnostic CI37801961320 confirmed the actual error: named sfmono-regular font
without a supplied font declaration. Actual SDK Editor attempt2 applied the targeted
generic-monospace repair; first attempt remains intact. CI37802468455 at1e9034a
passes real generated-output check/render/ffprobe/full-decode and canonical technical
review. Downloaded6second640×360/30fps video SHA57a15631247a505d9bd52e0ee3798f4022ad03cfb404cd47f4d8b8613f7c0e80
verified. See evidence/videoops-render/37802468455. Perceptual review remains
NOT_REVIEWED and no finalization/publication occurred. Combined Mission Command
launch and new release qualification remain open; local Docker restart decision
is pending because other containers may be interrupted.

Fresh CI37803464058 at289dd553804c7e5f5b368a0598c724fce2ed70f2 passes all5jobs:
147tests, source/browser checks, zero reported dependency vulnerabilities, four
installed platforms and Linux Workcell acceptance. Downloaded receipts are in
evidence/release-followthrough/37803464058. Prior CI selector ambiguity is resolved.
No qualification process remains running. Remaining work depends on Docker restart
coordination and actual candidate playback approval, then combined production launch,
finalization and new release. Both user decisions are pending; do not infer approval
or restart Docker while unrelated containers may be running.

2026-10-08 approval clarification: the user approved the separate six-second pixel
revision, SHA e0ad80db26d7f6746e6a970f41904fb1b9ea643bdb076ba7d3529c590fd7d28a;
see videos/pixel-title-card-v2/evidence/user-approval.json (fc17d91). This resolves
creative approval for that delivered video only. The earlier canonical Workcell
candidate remains unapproved, and combined Mission Command production acceptance
and new release qualification remain open. On resumed work, a bounded read-only
Docker info check again timed out after12seconds on desktop-linux. No engine
restart, model rerun, container cleanup or long soak was attempted. Next action:
restore Docker with operator coordination, then run the real Mission Command
production path and review its exact resulting candidate before finalization.

Docker recovery update: explicit user restart authorization received. Normal restart
failed after120seconds; terminating the stuck Docker application processes and
relaunching restored engine29.6.2. Images remain available, no data deleted. See
evidence/docker-recovery/receipt.json. Restart permission/engine unavailability
are resolved. The local VideoOps image is absent; only about7.3GiB was free after
recovery. Defer the large local image build while the user's other agent completes
storage cleanup. Combined production acceptance and exact-candidate review remain
open; this recovery does not qualify the release.
