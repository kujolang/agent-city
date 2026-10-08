# Explicit bounded model wait

A real Publishing House reviewer did not return within the fixed90-second wait.
Model connection now supports10–300seconds per model response, explicitly chosen
by the operator. Default remains90seconds. No retry, model fallback or success
inference was added. CLI uses CITY_MODEL_TIMEOUT_SECONDS; the gateway/renderer
remain uninvolved in execution. Longer waits may increase provider usage.

`controlled.json` uses an intentionally delayed local fixture with actual
SDK/Dispatch: a12-second response fails with10seconds and completes the separate
author/reviewer calls with20seconds. Both outcomes remain retained. This is a
regression test, not live AI product proof. Full verification passes95tests.

`sdk-deadline.json` additionally makes the reviewer wait125seconds, exceeding
the SDK default120-second deadline. With an explicit150-second provider wait,
both real SDK roles now complete in130.577seconds. The adapter supplies a finite
role deadline covering its allowed calls, check-ins and overhead; the author
budget includes its nested reviewer. This is City configuration of an existing
SDK API, not a changed SDK default. Original live rejection is retained in
../publishing-house/attempt-4-error.json and CaseFile2026-10-07-230821-publishingsdkdeadline.
