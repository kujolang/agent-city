# Real producer integration

The SDK example is `agents-sdk/examples/agent_city_observer.kujo`. Dispatch's
`examples/agent_city_observer.kujo` registers an ordinary agent handler via its
existing plugin API and launches that SDK example. A source-owned Dispatch run
ID is explicitly passed into the SDK. Every host invocation assigns a fresh
producer namespace and actor ID. The model callback is deterministic offline;
retrieval uses the actual local Kujo RAG HTTP service and indexed Kujo docs.

`bridge.ts` reads complete NDJSON records from private, per-execution 256 KiB
spools and invokes Watchdog's `watchdog_native_batch_normalize` through
`normalize.kujo`. It persists each serialized canonical batch before HTTP intake;
retries reuse those exact bytes. No network call runs in the SDK observer.
`watchdog.schema.json` is copied from Watchdog's canonical schema under MIT
(`WATCHDOG-LICENSE`); updates must be reviewed with the source adapter.

This is a scoped SDK run/retrieval/tool envelope, not universal lifecycle
coverage. Spools must be on a local filesystem; synchronous append has bounded
bytes but filesystem latency is not a hard real-time guarantee. Spool overflow
creates `.gap`; business execution continues. Bridge disk retention is bounded
by the local session quota; rotate into a new explicit session, never silently
truncate a producer spool. Historical gaps remain partial on reconnect.
