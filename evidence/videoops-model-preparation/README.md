# Real VideoOps preparation proof

Run `videoops-preparation-1791472748655` on 2026-10-08 used the existing
signed-in Codex CLI connector (`codex-cli-default`; underlying model UNKNOWN)
through the actual Kujo Agents SDK. Creative Director and Asset Scout each
passed on their first attempt. The task is a six-second original silent Agent
City title card; no external media, paid generation, or publication was requested.

`proof.json` retains the actual generated planning and asset bundles and gate
results. `normalized.json` contains all 14 unique canonical-backed observations:
seven starts and seven finishes, including the actual handoff and contract checks.

The original proof launcher stopped before the last six observations reached the
gateway. Restarting only the observer stack recovered all 14 from the existing
spool/cursor, without repeating either model execution. The harness now waits up
to 30 seconds for observation drain after source work completes. This wait does
not block business execution.

Validation: TypeScript passes; actual preparation gates pass; journal identities,
canonical evidence references and start/finish counts independently checked.

This qualifies preparation and observer recovery only. It is not an Editor,
render, perceptual review, finalization or end-to-end production acceptance claim.
The local Docker Desktop query still timed out at the latest bounded check;
default Docker has no socket. The user's other agent owns host disk cleanup.
The existing isolated-render CI qualification remains separate evidence.
