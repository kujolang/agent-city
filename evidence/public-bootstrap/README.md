# Public bootstrap qualification

Repository visibility changed to public on explicit user instruction. GitHub billing no longer prevents CI jobs starting. Run37704210809 at c075dce passed all four platforms: Ubuntu24.04 x64/ARM64 and macOS15 Intel/ARM64. Each job masked system Node, downloaded/checksummed a private Node24.21 runtime, fetched the public City archive at the exact revision, installed pinned producers and passed the installed mission contract. Downloaded receipts and contract evidence are retained per platform.

Earlier failed runs37703643293/37703848288 exposed macOS /var→/private/var entry-point aliasing: the installer exited without running. Fixed by comparing real paths, with a symlink regression test. Run37703959379 then exposed a contract-test race submitting before durable idle state; the test now waits for busy=false instead of weakening admission.

This proves bootstrap and controlled installed runtime contracts, not fresh-user real model configuration, container-engine installation, visual acceptance, the1000events/sec gate, or complete production release readiness. Historical private-distribution/CI-billing blockers are superseded at this scope.
