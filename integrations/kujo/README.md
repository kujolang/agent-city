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

## Mission tool permissions

The current PROPOSE author/reviewer adapter does not grant model-selected tools.
It can supply the separately requested read-only local `read_project_docs` result,
or public Kujo `get_catalog_item` metadata for Kujo missions. Public catalog
metadata is not a syntax manual or an authenticated privileged Ability gateway.

A provider response requesting any additional tool/function call fails the model
step explicitly, even when accompanied by plausible finished text. This covers
modern tool calls, legacy function calls, terminal tool-call finish reasons and
malformed call declarations. No requested tool is executed or presented
as completed, and no final artifact is created from that response. Metadata-only
provider diagnostics expose the refusal; older records retain UNKNOWN coverage.
Tool arguments and response content are not added to diagnostics or telemetry.

Broader tool support must add explicit grants, bounded arguments and results,
source-qualified invocation/attempt evidence, and an actual SDK tool execution
path before advertising a capability. Declaring a tool in an imported profile
alone does not activate it. Separately authorized post-review Workcell execution
and its named project exports remain independent platform operations.

## Approved local source reads

Start the app with `CITY_ENABLE_MCP_READS=1` only when the configured local Kujo
MCP server has an appropriate `permissions.allowed_directories` policy. Configure
`CITY_MCP_URL=http://127.0.0.1:8931/mcp/v1` and, for authenticated servers,
`CITY_MCP_TOKEN` in the server-side environment. The endpoint must be an HTTP
loopback IP with exactly `/mcp/v1`, without credentials, query or fragment.
Credentials never enter the browser or model context.

In Mission Command, expand **Approved MCP source reads** and enter up to three
relative names within that server's allowed workspace. Each grant makes one
actual SDK-registered `read_text_range` call for lines1–200 before drafting;
responses are limited to16KiB each, HTTP waiting to10seconds, and redirects are
refused. Raw results go privately to the configured model's author/reviewer
context, not canonical telemetry. Server-side workspace checks remain mandatory.
Hidden/parent/absolute paths and duplicate names are rejected before execution.

Imported authors must permit Kujo Docs. The exact grants are recorded privately
in the mission request and reset for every task/continuation. A failed read fails
the attempt without a final artifact; successful reads have distinct operation
IDs and observed outcomes. This is explicit user-requested source context, not
model-selected tool use, write access or general Ability/workflow execution.
