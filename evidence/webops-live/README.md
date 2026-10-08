# Real WebOps supplied-evidence reporting

PASS for this explicitly scoped workflow on development main (not immutable rc.2).
Mission `mission-faa7442d-ecd1-4e92-8708-92b87631c649`; Dispatch run
`run-1791465746881-8176`.

Existing Codex subscription connector, alias `codex-cli-default`; underlying model
ID UNKNOWN. Actual WebOps Reporter drafted a JSON report from retained release CI
and workflow-support evidence; a separate Publishing House Copy Chief reviewed it.
The report checker then validated site identity, referenced evidence IDs, action/
measurement types, UNKNOWN historical status and unavailable evidence families.

[proof.json](proof.json) contains the actual input, receipt and reviewed output.
[report.png](report.png) shows the DOM result. [snapshot.json](snapshot.json) records
14 normalized events and three distinct source-qualified instances, including real
handoff and evaluation start/finish through Watchdog → gateway. Workflow aggregate
remains UNKNOWN where canonical data does not establish it.

No website crawling, live analytics, publishing, external mutation or code execution
occurred. This uses the upstream reporter's degraded supplied-evidence contract.
Passing the contract check is not independent factual verification of supplied text.
User evidence is private mission context, not SSE payload. These particular demo
inputs reference public project evidence and are published with the requested proof.

Browser input/failed-report checks are separate controlled fixtures in
[webops-browser](../webops-browser/README.md). Live proof services stopped after the
task completed. No soak ran. To repeat with an existing authorized Codex CLI login:
`npx tsx scripts/webops-live-proof.ts`. It creates an isolated City runtime,
imports the actual catalog and submits one real author/reviewer task.
