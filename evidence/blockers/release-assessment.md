# Release assessment correction — 2026-09-08

The gate command only reads recorded evidence; it never runs or schedules a workload. The user cancelled the eight-hour soak. That coverage is now explicitly NOT_QUALIFIED, not an instruction to restart the soak and not a passing reliability result.

The evaluator now checks actual browser assertions rather than the number of cases. It independently identifies renderer recovery, browser UI zoom and hidden-tab resume coverage. CDP page scaling is not accepted as browser UI zoom. Source independence requires an actual stopped gateway and a nonempty spool, not merely a successful exit code. Throughput qualification requires 60 seconds and matching accepted/delivered counts, with zero reported loss or duplication.

The generated release-gates.json remains FAIL because the historical full pipeline measurement does not satisfy the requested rate or duration. Direct journal throughput passes its narrower gate. Neither result is promoted to current-build or complete product certification. Competing system load qualifies interpretation of timings, not event correctness or a pass threshold.

Verification: TypeScript check and five regression cases pass, including short bursts, missing/duplicated deliveries, absent duration, malformed browser cases and missing evidence. The gate exits 1 as expected on the existing nonqualifying evidence. No source operation, model, browser workload or soak was started for this correction.

Remaining product work includes reference-level art fidelity and current-build browser/reliability qualification. Historical evidence is retained unchanged except for the derived assessment. No sibling repository changes.
