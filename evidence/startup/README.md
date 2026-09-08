# Startup preflight evidence

`npm run doctor` inspects Node/runtime prerequisites, exact local entry points,
and service ports without starting a model or stopping existing processes.
`npm start` and `npm run local` apply the same checks before creating runtime
files or starting their services. A preflight is not a reservation: another
process can still acquire a port after the check; normal service startup can fail.

`local-preflight.json` records this host's observed port conflicts on 5178, 7792
and 7793 with prerequisites present. This is an expected refusal to launch a
second stack, not proof that the existing services are healthy or broken.
`refusal.log` and `refusal-result.txt` record the real launcher exiting 1 with an
explicitly nonexistent Kujo binary. No producer child was started by that path.

Four focused tests cover accumulated missing prerequisites without filesystem
writes, PATH executable resolution, non-HTTP occupied-port detection without
connections or shutdown, and invalid/duplicate port configuration. Typecheck,
architecture boundaries, maps/build and the existing suite passed; see the
verification receipt. Fresh full-stack startup remains to be verified in a free
port environment; existing listeners were not stopped to obtain a passing test.

The user's system-load report qualifies previous timing measurements: many other
applications were running. That is a confounder, not evidence that performance
budgets pass or that missing events can be ignored. No eight-hour test was run.
