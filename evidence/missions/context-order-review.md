# Current conversation remains after source context

The local Agent City adapter previously appended explicit MCP output after the task and reviewer draft, including after the continuation's current-request reminder. It now preserves system messages first, then historical context and explicitly requested MCP evidence, then the original current conversation and a current-user-request reminder. No source content is truncated and no additional tool call is implied or triggered.

The eight-request synthetic-provider contract in contract.json verifies MCP context before both writer task and reviewer draft, current task last, ordinary continuation without implicit MCP rerun, and a continuation that explicitly requests MCP alongside its historical context. Existing real SDK/Dispatch/RAG/MCP, controlled lifecycle start, provider failure, redirect rejection, private metadata, source survival and receipt reconciliation assertions pass. TypeScript and pure world-core boundaries also pass. No sibling repository changes were needed.

This is a message-ordering fix, not proof that the current local 1.5B model meets writing requirements or that retrieved text cannot influence a model. The real writing-quality gate remains open; no real-model retry or eight-hour soak was run. The 8087ded packaged preview predates this source change.
