# Workcell admission preflight

The prior admission path accepted operator enable/image settings without checking
that source, engine or image existed. The runner now rejects unavailable setup
before allocating a mission or calling the model. Its existing DOM form displays
the error. Two bounded read-only CLI commands inspect the selected engine and
local image; no pull, run or global-context mutation is performed. Raw CLI output
is never returned to the browser.

Unit checks cover unavailable engines, timeout, missing images, option-like image
input, exact read-only commands and context preservation. `proof.json` records an
actual runner HTTP POST using a private nonexistent DOCKER_HOST socket and a local
model-request counter. Result400, no jobs, zero model requests, no mission directory;
owned runner and counter services were stopped. No source task/container was run.

This is an early setup check, not proof of image contents, sandbox policy acceptance,
continued availability or successful execution. Those remain authoritative Workcell
results. Existing consent and operator enablement requirements remain in force.

Full `npm run verify`:81tests/28files, boundaries, maps, TypeScript and build PASS.
