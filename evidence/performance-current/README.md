# Current bounded performance measurements

Source: c60e5a1a3544e6bca83f4c43c2345ab278636a6f (measurement harness;
application behavior unchanged from the previously qualified UI).

`npm run build` followed by `npx tsx scripts/bundle-profile.ts` produces
[bundle.json](bundle.json). Every emitted JavaScript chunk, including lazy
renderer fallbacks, totals 240,603 gzip bytes (234.96KiB); emitted PNGs total
15,137 gzip bytes (14.78KiB). Both conservative payload totals meet the research
500KiB JavaScript / 2MiB initial visual asset targets. These are reproducible gzip
level9 file sums, not a measured HTTP download waterfall.

The two PNGs decode to 1,720,320 RGBA bytes (1.64MiB). This is image payload only:
it does not measure render targets, generated graphics geometry, browser/driver
allocations or total GPU memory. The 64MiB total texture target is not certified
by this number.

The renderer profile is [release-current.json](../renderer-scale/release-current.json):
5,25,100,500 synthetic semantic instances,120 measured frames after20 warm-up
frames per profile. The 100/500 cases retain two detailed selected/followed
instances and aggregate the rest. Assertions check unchanged semantic truth,
actor reuse, offscreen removal, instance hit selection and scene transitions.
The empty-page control measures60 rAF intervals before initializing Pixi.
Draw timing measures synchronous render submission; neither it nor rAF timing
measures GPU completion. Host load and browser version are recorded. This is a
short diagnostic, not long-duration stability or a new real-agent product proof.

No eight-hour soak was run or scheduled. Current release remains CONDITIONAL;
see [recorded hardening assessment](../blockers/release-gates.json). Complete
populated-world visual acceptance, current release packaging and the final real
useful-tool canvas recording remain separate work.

At25instances the uncached control measured p50/p95 frame intervals66.7/83.3ms,
versus16.7/16.8ms on the same empty page. Synchronous draw p95 was3.9ms.
The desktop16.7ms and mobile33.3ms frame targets are **not met by this run**.
This gap cannot be dismissed as uniform host scheduling from load averages alone;
GPU/backend behavior needs a targeted diagnosis on representative hardware.

A bounded static-scenery texture-cache experiment is retained in
[release-cached.json](../renderer-scale/release-cached.json):25-instance frame
p95 stayed66.7ms, draw p95 was3.7ms. All four scene pixel hashes matched the
uncached sample. The experiment did not qualify the target and was removed;
no extra cache behavior or texture allocation is shipped. Its dirty-source flag
is intentional. [release-before-cache.json](../renderer-scale/release-before-cache.json)
preserves the comparison input. No semantic code changed. Local verification
passed110tests, types, boundaries, maps and production build.
