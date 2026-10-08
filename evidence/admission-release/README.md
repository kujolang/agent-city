# Recover admission without inventing a mission outcome

When both source and supervisor terminal receipts are missing, the original mission
remains UNKNOWN. An operator can now explicitly release that mission's queue hold
from Mission Command history, after acknowledging that earlier work may still be
running. The decision is stored separately with identity and timestamp. It does not
change source status, create a finished timestamp, stop work, retry it, or emit a
semantic operation. Late source evidence can still reconcile the original mission.

The authenticated local POST requires explicit acknowledgement. Known active
supervision, foreign/missing command authorization, replay UI and unavailable history
storage fail closed. Duplicate acknowledgement retains the original decision.
New tasks are separate executions; after this explicit recovery choice they may
overlap with earlier work whose state cannot be established. Workcell cleanup is
still a separate ownership-checked operation, not implied by queue release.

`proof.json` and `released.png`: actual controller and mission DOM over controlled
lost-receipt history. Missing acknowledgement400, wrong token403, replay disabled,
cancel preserves hold, keyboard acceptance, no source calls during release, UNKNOWN
and absent finishedAt preserved. A new actual SDK/Dispatch run with controlled model
responses completed with two calls; no old work was rerun. Active supervision rejected
another release409. Controller restart retained the same decision and UNKNOWN state.
This is recovery testing, not real-model product proof. Local full97tests pass.

The initial browser test caught the recovery button being constructed only inside
the inspection click handler. It now renders with mission history; that failing
harness output remains under .runtime/admission-proof.log. No user mission was used.

The restart proof also supplies a controlled late terminal receipt for the old
mission. The controller reconciles COMPLETED from that receipt and retains the
separate admission decision; it rejects a further release409. This is explicitly
fixture evidence, not a claim that the earlier seeded UNKNOWN mission really ran.
