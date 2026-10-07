# Mission Workcell execution

Mission Command supports explicit post-review execution of statically valid Kujo
code in a generated disposable Workcell repository. The author/reviewer remain
PROPOSE profiles; execution belongs to a separate Workcell host identity. It
receives no project access or profile tool grant. No network, secrets or inherited
container environment are granted. The original draft/review are retained.

Operator setup requires a compatible local Kujo container image, passing Workcell
backend preflight, and a shared temporary directory (see ../workcell-live/README.md).
Set `CITY_ENABLE_WORKCELL=1`, `CITY_WORKCELL_IMAGE` and any required
`DOCKER_CONTEXT` / `CITY_WORKCELL_TMPDIR` before starting Agent City. No image is
pulled automatically. The user must also check **Execute checked Kujo code in
Workcell after review** for each submitted task. Merely enabling the operator
setting never grants mission execution. Non-Kujo requests are rejected.

After completion, **Open artifact** includes the private bounded output, actual
runtime version, Workcell receipt ID, artifact hashes and cleanup status. This
content is not added to the metadata-only lifecycle spool. Invalid syntax is
not executed. An unverified run reports execution/cleanup UNKNOWN; no output is
inferred. A completed draft/review mission is distinct from its execution result.
The opt-in is retained in request/job evidence. Continuation requests must opt in
again; permission is not inherited from the prior mission.

## Qualification

- `real-execution.json`: direct mission execution adapter ran previously generated
  code, returned5 and verified both exports/cleanup. No fresh model call in this
  particular adapter proof.
- `real/proof.json`, when present: fresh real cloud author/reviewer mission submitted
  through the local authenticated task API; asserts actual Workcell output5, MCP
  read, handoff, checked reviewed code and both artifact observations.
- Targeted permission tests reject absent operator configuration, malformed consent
  and wrong task type. Full project verification:76tests pass, typecheck (including
  integrations), maps, purity gate and production build.

Tested host Kujo1.7.0 and existing container Kujo1.5.0; not a broad compatibility
claim. General project work, interrupt/resume recovery and fresh browser visual
proof of this combined mission remain release gates. The existing UI control is
compiled, but this evidence does not claim a new screenshot or visual traversal.

## Browser inspector and consent verification

`browser/proof.json` and `browser/real-artifact.png` / `real-output.png` verify
that Chromium reads the retained real mission through the local runner API and
displays actual execution, cleanup and output evidence. A keyboard-operated
checkbox submits explicit consent; successful submission and choosing a follow-up
reset it. Submission transport is intercepted in this test, so it executes no new
model/container work and does not establish new in-game travel evidence.
Run `node --import tsx scripts/workcell-browser-proof.ts` with local retained
mission evidence present; `CHROMIUM_PATH` can select an installed browser.

## Read-only checkpoint recovery

The mission adapter atomically saves a pending record before invoking Workcell
and atomically replaces it afterward. `/control/workcell/:id` is scoped to known
local mission history and remains readable when overall mission status is UNKNOWN.
A missing final record can be reconstructed only from matching run/producer proof,
a successful CLI result and verified receipt/artifact/cleanup evidence. Reads
never execute commands, retry work, write checkpoints or fabricate telemetry.
Overall mission status stays independent; partial evidence stays UNKNOWN.

`recovery/proof.json` simulates losing the final checkpoint over a copy of actual
mission receipts. It recovers output5, leaves the checkpoint unchanged and returns
identical repeated reads. This is a controlled recovery test, not a claim that an
actual live process was killed. Targeted tests reject wrong identity, failures,
timeout and missing exports. Full interrupt/cancel/container cleanup qualification
is still pending.

## Repair context

An explicit follow-up now includes prior static validation and Workcell status,
exit information, output, runtime version and evidence references. Unknown stays
unknown; old records are unchanged. These are historical model context, not
permission to execute the next attempt. Execution consent is still per request.
`continuation/proof.json` verifies context assembly using the real completed
mission and output5; no new model or container ran for that verification. Tests
cover unverified execution, no inherited permission and the total context limit.

## World presentation correction

The authored Workshop station is now `workcell-bay`, replacing the old
`workcell-unavailable` ID. Start observations establish invocation only and use
wait animation; a visit containing active invocations continues to wait. Verified
completed work can animate as RECENT work; failures retain alert presentation.
The planner tests reach the upper bay with unchanged instance identity, distinguish
start/success/failure, and produce identical repeated state. This is deterministic
unit/retained-replay verification, not a fresh live world/browser proof.

Compiled map hash and core source hash change with this correction. Historical
pinned replay requires its original matching map/core; no old bundle is relabeled.
Full verification passed79tests/27files, map gates, pure-core boundary, TypeScript
and production build; final active-operation guard passed targeted14tests.

## Fresh canonical pipeline and Follow proof

`live-world/proof.json` and `live-world/workcell-bay.png` prove a fresh actual
Kujo container execution, metadata lifecycle spool, Watchdog canonical intake/
export, gateway/SSE truth, and Pixi Follow at the upper Workshop bay. The exact
instance remains followed; real operation success and both artifact observations
reach browser truth. Actual container output is5. This invokes the previously
model-generated Kujo file; no new model request is claimed.

Run `scripts/workcell-live-proof.ts` with the documented local Workcell backend,
image and shared temporary directory. It reserves isolated ports18991/18992/18888,
uses private databases/tokens, and stops its own services. Start/stop your dedicated
VM separately. The successful bounded test left no Workcell containers.

The initial harness unnecessarily toggled Follow after selecting an agent; the
corrected rerun explicitly asserts `follow === instance`. This proof establishes
Workshop/bay arrival; it does not claim cross-building tool travel, a new model
handoff or live process-interruption qualification.

## Real gateway outage during source execution

With `CITY_PROOF_GATEWAY_OUTAGE=1`, the live harness stops its own gateway and
waits for terminal process status and browser STALE before starting real Workcell
execution. It restarts the gateway only after source exit0. Browser health returns
LIVE and truth contains succeeded Workcell plus both actual exported artifacts.
`gateway-outage/proof.json` records ordered stop/completion/restart timestamps,
actual output5 and exactly one source receipt directory: recovery did not rerun
work. The original Watchdog/bridge remained available; their failure is not tested
by this scenario. No animation/travel assertion is made for recovered history.
Owned services and dedicated VM were stopped; no Workcell containers remained.
Actual source-process interruption and orphan-container cleanup remain separate
unqualified cases. TypeScript validation passed for the extended harness.

## Real Watchdog outage and spool recovery

`CITY_PROOF_WATCHDOG_OUTAGE=1` stops the owned Watchdog service before source
execution and waits for browser STALE. Actual Workcell finishes with output5
while intake is unavailable; its completion is present in the bounded local spool
before Watchdog restarts. The existing bridge retries canonical delivery, gateway
truth recovers, and the browser returns LIVE. `watchdog-outage/proof.json` retains
ordered timestamps and actual references:6source lifecycle records recovered as
6unique canonical evidence references, exactly1source run. No model or source work
is rerun. This covers the tested short observer outage, not spool overflow, prolonged
retention loss or source-process interruption. Owned services/VM stopped, no
Workcell containers left; TypeScript passed.

## Real operator cancellation

`scripts/workcell-cancel-proof.ts` runs a deliberate loop under the existing
30-second Workcell limit. It discovers only its own run directory, confirms that
exact run's labeled container is running, then creates the operator cancellation
file. `CITY_WORKCELL_CANCEL_FILE` forwards that explicit host hook to Workcell.
No game control or automatic task cancellation is introduced.

The first real attempt stopped and cleaned up but incorrectly reported cancelled
false/exit-1. Workcell used a dictionary-only getter on Kujo's ProcessResult struct.
A small independent producer fix reads that field correctly with an explicit
dictionary fallback; its regression covers actual native cancellation, true/false
dictionaries and missing fields. The rerun reports actual cancellation and
complete cleanup; container/workspace absence and no successful artifact
observation were checked. Original failed classification remains in CaseFile
2026-10-07-164549-workcellcancellationclassification and local receipts.

`cancellation/proof.json` records the successful rerun and original attempt ID.
This qualifies cooperative operator cancellation of the tested local workload,
not forced host-process death, every backend or crash/orphan recovery.

Producer fix: Workcell `0baaad5`. Tested host Kujo1.7.0 and existing container
Kujo1.5.0; this is not qualification of every Workcell release/backend combination.

Verification: native cancellation regression and actual container cancellation pass;
City typecheck passes. Workcell quality, release-report, Markdown links and all23
official-adapter unit tests/integrity pass. Full Workcell suite does NOT pass: its
cloud-adapter release-candidate gate stops at npm audit (6 high,1 critical).
`cancellation/optional-adapters-audit.json` retains the report; reachability is
unassessed. These dependencies are outside the tested local Docker execution path.
Default version check expects1.6; the documented1.7 test override passes.
Remaining cleanup, secret-scope, startup/lifecycle-failure and endpoint contracts
passed when run separately after the audit stop; see cancellation/verification.json.
