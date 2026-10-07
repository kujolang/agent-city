# Bounded process-tree diagnostic

The harness now records owned descendant CPU/RSS snapshots without capturing
command arguments, alongside the original direct-process columns. The short
requested10second probe delivered8,500/8,500 with zero observed missing/duplicate
events over41.649seconds (including bounded sender overrun), at204.087events/sec.
It does not qualify the60second/1000events/sec gate and does not establish a causal
CPU bottleneck from two snapshots. No producer code or semantic checks were changed.

See proof.json. The dedicated service processes exited without forced cleanup.
