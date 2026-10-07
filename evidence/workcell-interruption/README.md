# Workcell source interruption qualification

Real run `wc-a15bbd71e4154aebad95b603d48e607d` used the locally built Kujo 1.7 Linux AMD64 image and a finite 20-second workload. After observing its running container, the harness killed only the owned Workcell host process group. This was a fault-injection execution, not a new model task.

The adapter returned failure for its invocation but did not invent a workload outcome. Its four retained lifecycle records include a disconnect coverage gap, no workload finish and no success artifact. Actual Watchdog intake/export, gateway normalization and the pure truth reducer preserved canonical gap status `unset`, disconnect reason and partial coverage. There is no browser assertion in this proof.

The source checkpoint remains unchanged: prepared, null exit code, cleanup pending. The finite container was allowed to stop. The harness then removed the exact labeled container and used the existing ownership-checked Workcell workspace cleanup library to remove its workspace. Cleanup is recorded separately; the workload was never rerun and its outcome remains UNKNOWN. This qualifies manual scoped recovery, not automatic orphan cleanup or general crash recovery.

The initial harness incorrectly expected no receipt; Workcell had correctly retained a prepared checkpoint. A later export check incorrectly supplied cursor `0`; the valid empty cursor recovered the same canonical records. Both harness errors were corrected without rerunning source work. CaseFile `2026-10-07-174012-sourceinterruptionharness` retains the local failure evidence.

See [metadata proof](proof.json). Private receipts and canonical export remain under `.runtime/workcell-interrupt-1791408960`. Full verification passed 85 tests across 30 files, plus map, boundary, TypeScript and production build checks. Dedicated test services and VM were stopped.
