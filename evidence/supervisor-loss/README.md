# Supervisor loss preserves source truth

A supervisor's exit does not establish that its descendant mission failed. The
controller previously converted any nonzero supervisor exit into mission failure,
even when the source process was still running. It now records the exit separately,
keeps the mission UNKNOWN, and reconciles only an explicit bounded source/process
receipt. Admission stays blocked while the outcome is unknown, including when
reading the receipt fails. No task or observation is fabricated to release the queue.

`proof.json`: actual SDK/Dispatch, with a controlled model endpoint held during the
author call. The harness verifies the source PID and exact parent relationship
before killing only its owned supervisor. The controller reports UNKNOWN without
a finished timestamp and refuses a second mission (409). Releasing the original
provider response lets the same author/reviewer run finish. The source receipt
establishes COMPLETED and releases admission: one mission, two calls, no rerun.
This is controlled failure-recovery evidence, not real-model product proof.

The existing controller-restart / observed-child-failure regression also passes;
its refreshed receipt remains in ../mission-supervisor. Full local96tests, types,
boundaries, maps and build pass. The installed proof is now part of all four platform
CI jobs. Missing evidence from both supervisor and source still remains UNKNOWN;
this change does not claim automatic orphan cleanup or general project execution.
