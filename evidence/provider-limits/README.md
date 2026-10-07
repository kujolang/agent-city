# Provider limit diagnosis and real recovery — 2026-10-07

A repeated real glm-5.3:cloud reviewer request returned HTTP200, finish_reason
length, and zero content at requested2048 tokens. The author returned stop and147
characters. This is observed response metadata, not an inference from a generic
handoff failure. No reasoning text was retained or inspected.

The explicit8192-token attempt returned stop for both roles (reviewer1725
characters). Its corrected documentation section preserves the exact source,
correct sum statement and example, excludes the invented Go APIs, and both
extracted Kujo code blocks pass the actual compiler syntax check. The whole
response includes extra reviewer findings, so strict documentation-only output
and general model quality are NOT qualified. All previous attempts remain intact.
See real-recovery.json for exact IDs, metadata, checks and artifact hash.

Implementation: configurable256–16384 requested tokens (default2048), private
bounded metadata diagnostics, authorized local mission lookup and failure UI.
No automatic budget increase or retry. A provider length stop now fails even
when partial content is nonempty; that partial content is retained privately.
Diagnostic recording is best effort and cannot stop source work.

fixture.json proves that behavior with a controlled provider and real SDK/Dispatch:
one request at4096, failed mission, retained partial text and excluded reasoning
text. Run `node --import tsx scripts/provider-limit-proof.ts` to reproduce.
Browser proof confirms explicit8192 saved configuration, actual failed-attempt
metadata, and hidden controls remaining hidden. See browser.json/diagnostics.png.
Full verify71tests/23files plus types/maps/boundaries/build passes; final CSS hidden
attribute correction is separately browser-verified.

Provider-specific finish metadata is not a guarantee of task quality. Missing or
unrecognized metadata remains unknown. This fix does not complete the full
installation, ecosystem execution, visual or reliability release checklist.
