# Requested release follow-through

Scope from the user's “do those things now” request, 2026-10-08. Keep all five
workstreams open until their actual evidence exists. No eight-hour soak is authorized.

- [ ] Versioned public release: immutable tag/release notes, supported platforms,
      pinned installation and verified release artifacts. Publish only after the
      changes are concrete and verified; no claim of universal workflow support.
- [x] Easier Workcell setup: explicit one-command image setup, persisted immutable
      image/context, normal restart, clear disable/recovery path, per-task consent.
- [ ] First-time provider onboarding: absent/missing/authentication/model faults,
      useful recovery guidance, real fresh-configuration task where credentials
      already authorize it. Never create accounts or invent authentication proof.
- [ ] Bounded reliability/performance: graphics slowdown diagnosis, actual
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
