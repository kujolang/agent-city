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
