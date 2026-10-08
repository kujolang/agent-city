# Supported workflows

Mission Command runs the workflows below. The city displays their observed
operations, artifacts, and check results. Buildings and imported profiles do
not grant tool access.

| Workflow | Output | Requirements and limits |
| --- | --- | --- |
| Writing and Publishing House | Saved text and a separate review | Configure a model and choose eligible author/reviewer profiles. Publishing House does not publish to a CMS or distribution service. |
| Code and review | Generated code, review, and enabled check results | Syntax checks do not establish functional correctness. JavaScript function checks run only the cases you provide. |
| Kujo tool | Source reads, generated Kujo, review, syntax check, and optional execution results | Grant MCP/context access as needed. Execution requires Workcell setup and per-task permission. |
| Project files | Selected input snapshots and named output files | Choose files explicitly. Workcell receives copies, not a host-project mount. Exported files are downloaded, not applied to the original project. |
| WebOps | A reviewed report based on supplied site evidence | Supply timestamped evidence. This workflow does not crawl sites, access analytics, edit repositories, deploy, or schedule recurring work. |
| VideoOps | A rendered video, review record, and finalized download | Configure a capable model and compatible render image. Supply approved media or authorize supported generation. Each candidate requires its own visual review and, when applicable, listening review. |
| Archive and replay | Timelines, evidence, comparisons, and recorded activity | Read-only; replay invokes no model, tool, or source operation. |

## Profiles and model access

Only profiles whose required capabilities are available can run. Importing the
catalog preserves role contracts; it does not activate arbitrary named skills,
workflows, or tools. A model's claim that it checked, rendered, or published
something does not establish that the operation occurred. Inspect the recorded
operation and result.

Local Ollama normally needs no API key. Remote providers may require one.
The Codex connector uses an existing CLI login; it does not import CLI tools or
turn a subscription into a general API key.

## Setup guides

- [First task](../TRY-AGENT-CITY.md)
- [Reviewed Kujo tool](try-a-reviewed-tool.md)
- [Workcell setup](../installer/README.md#workcell-setup)
- [VideoOps](videoops.md)
- [Product media and optional audio generation](videoops-media.md)
