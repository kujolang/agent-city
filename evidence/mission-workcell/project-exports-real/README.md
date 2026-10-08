# Actual model project editing and exported review bundle

Real execution sourced4c7f38; missionb857d6fe-c40c-4fa7-ae7e-2e6ed2fd7467.
Ollama glm-5.3:cloud author and separate reviewer used the actual Kujo MCP read,
then produced the saved reviewed.kujo program. Workcell executed it against the
explicit copied project snapshot. It read the file, appended the requested suffix,
wrote the copied file and printed its contents. The actual stdout check passed.
The named output was exported with verified bytes and before/after hashes; no
host project was mounted or modified. Two model responses were observed.

The original live proof ended on an obsolete assertion expecting two Workcell
artifact events. The run actually succeeded and produced the expected three:
stdout, runtime version and the named project file. afa793e compares explicit
receipt-linked references and adds scripts/project-export-recheck.ts. That
read-only verifier rechecked the existing receipt, source, output bytes, hashes,
MCP/handoff/check events and provider response metadata. It did not rerun the
model/container or alter the earlier execution. proof.json distinguishes the
execution source from the verification source.

Earlier attempts remain in prior-attempts.json and their private runtime paths:
one completed drafting/review but execution remained unavailable due to an invalid
export-policy depth; another failed on empty output at the provider token limit.
CaseFile2026-10-08-012816-projectexportdepth retains the configuration failure.
No failed or unavailable attempt was relabeled successful. The later bounded task
requested a review under150words with the same provider/16384-token limit.

The real returned JSON file bundle was downloaded in Chromium and compared with
the actual private API output and receipt identity. Browser evidence is in
../project-exports-browser. This proves the named-file workflow, not arbitrary
MCP/Ability execution, general host editing or the final usable-tool/video demo.
Owned proof services and the dedicated container VM were stopped afterward.
