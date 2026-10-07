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
