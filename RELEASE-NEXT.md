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
