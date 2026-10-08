# Live model output failure and repair

Source6275f46. Actual Ollama `glm-5.3:cloud`,16384 output-token limit,180-second
request deadline. Existing authenticated provider reused. Two explicit missions:

- `mission-49e3a0e2-3a3f-4709-9c25-7c1a32697d71`: requested a deliberately buggy
  subtraction regression fixture. Actual reviewed Kujo passed syntax and ran in
  Workcell, producing `-1\n`; the user-supplied `5\n` check failed.
- `mission-37fc4cac-959a-4aab-8d39-a254f5c22e0b`: explicit follow-up repaired the
  program from actual prior validation context. Workcell produced `5\n`; check
  passed. The original failure was read again and remained unchanged.

Each run used imported Frontend Developer→Code Reviewer profiles, a real Kujo MCP
read, actual SDK handoff, two recorded model responses, static check, isolated
Workcell execution and separate output-check identity. The first defect was
explicitly seeded, not an accidental model mistake. This arithmetic acceptance
probe is not the promised final usable-tool demonstration.

`execution.json` contains verified Workcell receipt/artifact references, output,
cleanup and hashes of actual model responses; raw prompts/responses are private.
Both containers were absent after completion. Only the owned dedicated VM was
started/stopped; the user's Ollama service and default Docker context were retained.

`world/proof.json` attaches the observer while a source mission is active, without
rerunning work. Real spools→Watchdog canonical→gateway→browser retains FAILED and
SUCCEEDED output checks. Follow preserves one exact checker identity across
Workshop→city→Dojo. `world/visit-3.png` shows both actual outcome labels. Some
operations arrived after completion and are RECENT; this does not prove every
stage was animated live. The browser reports LIVE feed with a retained coverage
gap. This proof does not establish complete source coverage; the warning is visible.
No browser errors were recorded. No long soak or final video was run.

CI37726163114 initially failed Linux qualification because the proof queried Git
inside a Git-free managed installation, after work completed. CaseFile
`2026-10-08-001335-installedproofgitprovenance` retains the failure. Commit7987091
uses the managed install receipt when Git is unavailable; unknown provenance stays
unknown. Replacement CI must qualify that correction independently.

Coverage detail: the derived journal records a gateway disconnect followed by
reconciliation813ms later. All48 emitted lifecycle records have48 normalized
observations, alongside the two health records. `coverage.json` retains those
health events. This accounts for the warning without claiming instrumentation
coverage beyond the emitted records.

Replacement CI37726493917 at7987091 passes all5jobs: source/browser and four
installation platforms, with actual controlled-provider Workcell repairs on both
Linux architectures. This supersedes the Git-free harness failure, not the retained
history. The live-model evidence above remains a separate local qualification.
