# Bounded renderer scale and lifecycle checks

Synthetic presentation snapshots only. No model, source task, Watchdog ingestion,
or eight-hour soak is part of this test. This does not close the full-path
1,000 events/second gate or establish production release readiness.

## Current bounded sample — September 8, 2026

`bounded-60.json` measures the renderer from `880ac11` with the updated diagnostic
in this commit: 20 warm-up frames, then 60 measured consecutive rAF intervals per
count. Pixel extraction happens before warm-up. Unlike the previous diagnostic,
the first interval does not mix a `performance.now()` origin with a rAF timestamp.
The harness records host load and explicitly labels fewer than 60 samples as
insufficient for timing estimates. This is a measurement correction, not a
renderer speedup. The user reports substantial concurrent host activity.

| Instances | Detailed sprites | Draw submission p50 / p95 ms | Frame interval p50 / p95 ms |
| --- | --- | --- | --- |
| 5 | 5 | 2.7 / 3.7 | 66.7 / 66.8 |
| 25 | 25 | 3.1 / 4.5 | 66.6 / 83.3 |
| 100 | 2 | 3.2 / 4.4 | 66.6 / 66.7 |
| 500 | 2 | 3.4 / 4.1 | 66.7 / 83.3 |

All profiles passed unchanged truth, retained actor identity, exact-instance
selection, building hit tests, cross-scene follow retention and offscreen removal;
no browser errors occurred. Typecheck passed. These synthetic, single-scene,
headless measurements do not qualify 60 FPS, GPU completion, inspector latency,
upstream latency, hidden-tab behavior, or long-running reliability. Host load
provides context but does not establish the cause of slower frame intervals.

Reproduce with
`CITY_RENDER_PROFILE=bounded-60 CITY_RENDER_FRAMES=60 npx tsx scripts/renderer-scale-proof.ts`.
The existing 180-second hard deadline remains in force; no soak ran.

## Historical measurements

The before measurement used the renderer at `ee07541`. `after.json` measures
actor reuse before the subsequent aggregate-count label change, with 180 frames
per profile in Chromium 151 on this host. These are wall-clock draw invocation
costs (including submission), not GPU-only times or upstream-to-visible latency.

| Semantic instances | Detailed sprites | Before draw p50 / p95 ms | After draw p50 / p95 ms |
| --- | --- | --- | --- |
| 5 | 5 | 3.7 / 5.0 | 2.3 / 3.2 |
| 25 | 25 | 5.1 / 8.1 | 3.1 / 4.1 |
| 100 | 2 | 3.4 / 4.5 | 3.1 / 4.4 |
| 500 | 2 | 3.7 / 4.7 | 3.4 / 4.5 |

All 180 frames previously replaced the actor containers; no measured frame now
replaces them. The selected and followed execution IDs remain detailed at high
counts. During the stationary sample, live display-tree object counts are
28 / 88 / 19 / 19 respectively, including six persistent building hit targets.
The initial extracted pixel hashes match before/after for all four profiles.

Frame interval p95 was 66.7–83.4 ms before and 83.4–100 ms after. These headless
measurements do NOT prove 60 FPS or an improvement in delivered frame rate.
Do not substitute draw cost for frame intervals. The profiles are short and are
not a stable heap/texture-memory or long-running reliability qualification.

`lifecycle.json` and `aggregate.json` use just two frames per profile to verify
behavior; their cold timing values are not performance estimates. They check:

- stable actor identity across ticks and followed city/Library/Workshop scenes;
- source truth remains unchanged;
- instance-specific selection, real browser building hit testing and hit reuse;
- offscreen actors and removed snapshot instances release their objects;
- 100/500 instances keep at most selected/followed actors detailed.

The final aggregate screenshots show per-building **VISUAL** counts. These count
presentation locations, not current runtime operations; inspector truth remains
separate. Counts do not spawn fake citizens or imply semantic work.

Run `CITY_RENDER_PROFILE=current npx tsx scripts/renderer-scale-proof.ts` for a
fresh 180-frame sample. Use `CITY_RENDER_FRAMES=2` only for short behavior checks.
The script closes its isolated browser/server. No production services are stopped.

A screenshot run stalled after two profiles and its Chromium process was no
longer present in the local inventory. Only its owned Node/Vite processes were
stopped. The subsequent four-profile retry and screenshots passed. Cause is not
established; see reviewed log-import Casefile
`2026-09-08-114231-cityrenderercapturestall` under `casefile/`. The diagnostic now
has a hard 180-second deadline, including browser shutdown. This isolated incident
is not evidence of long-run stability. Final verification: 36 tests, typecheck,
architectural boundaries, maps and build passed.
