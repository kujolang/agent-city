# Requested release follow-through

Scope from the user's “do those things now” request, 2026-10-08. Keep all five
workstreams open until their actual evidence exists. No eight-hour soak is authorized.

- [ ] Versioned public release: immutable tag/release notes, supported platforms,
      pinned installation and verified release artifacts. Publish only after the
      changes are concrete and verified; no claim of universal workflow support.
- [ ] Easier Workcell setup: explicit one-command image setup, persisted immutable
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
