# VideoOps SDK stage contract

PASS for controlled integration, not live model production.

Run `npx tsx scripts/videoops-stage-proof.ts`. The real Kujo SDK executes the
current imported Creative Director contract against an explicit synthetic provider.
The provider is held until the actual metadata spool reports operation start.
The proof then checks stored role artifacts, duplicate invocation refusal without
another provider call, malformed artifact failure, and refusal of model-requested
tools. Failed attempts remain separate; private response text never enters telemetry.

`apps/runner/videoops-stage.ts` requires the exact role, unchanged contract hashes,
PROPOSE permission and evidence for every required capability. Operator evidence
is labeled as such; model claims cannot supply authority. This runner neither
renders nor treats a text critic response as perceptual approval. Caller-provided
capability evidence must come from the runtime/operator, not the model or an
unvalidated browser payload. No public submission route exposes this internal API.

`integrations/kujo/videoops-stage.kujo` performs bounded actual SDK calls and uses
the existing fail-open local lifecycle spool. Artifact-path/byte/JSON checks emit
separate observed evaluations. Stored artifacts do not yet establish upstream
artifact-schema validity, creative quality or a usable video.

The first controlled attempt revealed that an SDK iteration limit of one prevents
completion of its state machine. That failed attempt remains in its private
.runtime/videoops-stage-fixture directory. The corrected bounded limit uses eight,
matching the existing mission runner; it does not blindly retry failed providers.

Remaining: validate the full stage handoffs, capability-qualified production
orchestration, isolated render, exact-candidate independent review, UI and live proof.
No paid model, render, publication, sibling source edit or long soak was used here.
