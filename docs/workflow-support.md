# What Agent City can execute

Agent City is a local preview. A building, imported profile, declared skill or
workflow name is not proof that the corresponding tool is executable. Mission
Command performs supported work; the city observes the real lifecycle.

| Workflow | Current execution | Required setup / boundary |
| --- | --- | --- |
| Writing → separate review | Actual provider calls, saved final text and review | Configure your provider; select eligible PROPOSE author/reviewer |
| Code → separate review | Actual generated code and review; explicit supported function checks | Provider plus a supported check contract; generated code alone is not proof it runs |
| Kujo tool → review → check | Real catalog/docs/source reads, syntax check, optional isolated execution and output checks | Explicit MCP/context permission; saved Workcell image plus per-task consent for execution |
| Project inputs / named output files | Selected copied input files, isolated artifact execution and named export | Explicit file selection/consent; no unrestricted host-project mutation |
| Publishing House | Technical writer → copy-chief draft/review demonstrated | Local saved draft only; no CMS publication, account access or distribution |
| WebOps supplied-evidence report | WebOps Reporter → Copy Chief → deterministic report contract check demonstrated on development main | Choose the explicit workflow and supply bounded timestamped site evidence; no crawl, analytics, repository edit, deployment or recurring management. Other WebOps profiles remain unavailable. Not included in immutable rc.2 |
| VideoOps (development main) | Real browser launch → Codex Planner → Asset Scout → Editor → isolated render → technical PASS and review UI demonstrated; finalization implemented | Explicit saved image/model capability setup and per-task render consent. Initial UI supports original silent typography/vector work. Exact-video human review is required before finalization. Exact resulting candidate human approval/finalization remains pending; not included in immutable rc.2 |
| Archive / replay | Read-only timeline, evidence, comparison and semantic playback | Replays do not invoke models, tools or source operations |

The existing release-notes tool recording proves the Kujo row, not every row in
the ecosystem. See [its source, exact model provenance and execution receipt](../evidence/reviewed-release-tool/README.md).
The [Publishing House proof](../evidence/publishing-house/README.md) qualifies the
named draft/review task only. The [WebOps reporting proof](../evidence/webops-live/README.md) qualifies supplied-evidence reporting only. Selected VideoOps acceptance and adapters
needed for advertised production workflows remain open in [RELEASE-NEXT](../RELEASE-NEXT.md).

Profiles with required capabilities the runtime cannot supply are unavailable.
Do not remove those requirements merely to make them selectable. A model's text
claim that it rendered, published, deployed or checked something is not evidence
that it happened. Inspect the actual operations, artifacts and check outcomes.

Local Ollama normally needs no API key; select an installed model explicitly.
A remote provider may require its own key. The Codex subscription connector uses
existing CLI authentication and a generated private local bridge credential; it
does not turn your subscription into a general API key or import every CLI skill.
