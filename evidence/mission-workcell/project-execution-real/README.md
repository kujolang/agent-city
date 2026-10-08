# Actual model / project snapshot / Workcell proof

Sourceca28f9f. Missione53d3b2a-26eb-439b-b28c-c35eac051526 used real
Ollama glm-5.3:cloud, imported Frontend Developer and Code Reviewer profiles,
actual public Kujo MCP documentation read, SDK handoff, Kujo static check and
opt-in Workcell execution. The model authored read_file against the copied path;
it did not embed the known input text. The real output check passed exactly.
Workcell receiptwc-3ad7c2f6b6464016b649902ad0f6ab00 proves execution and cleanup.
Only the explicitly copied snapshot was available; host projects were not mounted.

Both real responses were recorded. The reviewer used a fenced JSON envelope;
its outer fence was explicitly removed, the exact two required fields validated,
and the raw response retained. reviewed.kujo is the actual saved source.
Private review metadata records envelopeFenceRemoved=true. Check outcomes remain
actual runtime evidence, separate from model review opinions.

The earlier real attemptd8643d7b-76a2-473b-ab67-dad0cf22fa01 failed under the
previous strict envelope parser. Its receipt is retained in prior-failed-receipt.json;
raw private evidence remains under the runtime path documented by CaseFile
2026-10-08-010434-projectreviewenvelope. Neither failed attempt nor history was
rewritten; this was a new explicit proof run, not a continuation or hidden retry.

This verifies project-input execution, not general host editing, arbitrary MCP/
Ability workflows, final visual acceptance or the queued usable-tool/video demo.
Owned services and the dedicated Colima VM were stopped after verification.
