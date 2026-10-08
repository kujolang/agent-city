# Canonical intake profiling

These are bounded synthetic diagnostics, not real-task proof or release qualification.
The production release assessment explicitly rejects diagnostic receipts.

- `local.json`: four sequential 100-record batches on the busy macOS host. Caching
  record attributes did not establish a causal improvement and was reverted.
- `x64-before.json`: isolated CI run37717322117 at Citye180b17 / Watchdogf463ced,
  with the real browser and reconnects. All66,000 events delivered, but gateway
  throughput922.648/sec and browser-visible throughput901.712/sec remained below
  target. First four batches had median policy119.28ms, validation165.40ms,
  preparation87.65ms, writer wait9.75ms, insertion48.99ms. These are early samples,
  not a whole-run CPU profile; concurrent stages overlap.
- `local-native-hex.json`: native character validation candidate, still uncommitted
  when sampled. Local validation106.19ms versus129.32ms in the local baseline;
  neighboring stages were broadly comparable. Host variability prevents claiming
  a qualified end-to-end speedup.

Watchdog4ceb203 replaces the interpreted hexadecimal character loop with a native
invalid-character check. Lowercasing, trimming, length and zero-ID rejection are
unchanged.330 differential cases, repository validation, observability semantics,
identity conflict, concurrent ingestion/privacy, canonical API and source mirrors
pass with the pinned Kujo1.7 runtime. No new runtime release is required. The City
installer pins that independent producer commit. Full throughput requalification
must use a fresh non-diagnostic run; no threshold has changed.
