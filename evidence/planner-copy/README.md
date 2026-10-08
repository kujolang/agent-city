# Planner copy scope

The pure planner now deep-copies only the event's affected walker and shares
unchanged walkers. Previously every metadata event copied all walker queues and
visits. No event coalescing rules, evidence, time ordering or routes changed.

`npx tsx scripts/planner-profile.ts /tmp/planner-profile.json` applies2,500
explicitly synthetic observations over25instances with fixed ticks. Before and
after semantic-state SHA-256 is identical:
2636f6640d932a8cf28525163c1495726aeacf9cf2f50a5015c27bf88c8daaf8.
Local diagnostics measured3,037.96ms before and522.73ms after. These are single
samples on a busy workstation, not a throughput or frame-time qualification.

The regression checks immutable earlier plans, coalesced visit keys and unchanged
other-agent state. Full verify90tests, boundaries, maps, types and build pass.
The failed CI37711534081 remains failure evidence; fresh load qualification is
required. No runtime source or model was executed by this diagnostic.
