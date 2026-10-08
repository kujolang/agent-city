# Selected project context qualification

Agent City accepts up to eight explicitly selected UTF-8 text files,16 KiB each and
32 KiB total. Content is validated, copied into a private mission snapshot and hashed.
Relative names are labels, never host paths. No host files are mounted or modified,
no tool permissions are granted, and attachment alone emits no semantic activity.
Names/bytes/hashes appear in mission inspection; contents are supplied as untrusted
source material to author and reviewer and excluded from telemetry.

The local controlled proof verifies four actual SDK model requests over two tasks,
unchanged selected content on an explicit follow-up, metadata-only inspection and
no file-content leakage in lifecycle spools. Browser proof verifies selected file
submission and reset.101unit tests/types/boundaries/maps/build pass. The local
proof's source84dc468 is its base revision with the059c899 implementation overlay;
installed CI independently qualifies committed sources.

The real-model counterpart is ../project-context-real: actual glm-5.3:cloud used
a requirement supplied only by attachment to create add(a,b) with a7-unit processing
surcharge. All three independent function cases pass. This demonstrates project
context use, not arbitrary repository editing or external workflow execution.

Initial Linux CI37727826473/37727960108 lacked a working Chromium sandbox; the
checker was unavailable, not a failed generated-code test. Diagnostics added in
8e64084 exposed the cause in37728114196. CaseFile
2026-10-08-003627-projectcheckersandbox preserves it. fc854b4 configures a profile
for the exact Chromium binary only on the disposable CI runner, as documented by
[Ubuntu](https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890/1).
It does not change global namespace restrictions or disable Chromium sandboxing.
Product startup never changes OS policy. The forced missing-browser regression
retains UNKNOWN execution/evaluation and a private bounded diagnostic.

Qualified installed run: CI37728551353 atfd65455 passes all5jobs. Linuxx64 receipts
are copied outside the application before installer maintenance, downloaded and
checked against the exact tested source revision. installed.json proves four
context-bearing SDK requests and retained snapshots; installed-unavailable.json
proves unavailable checks remain UNKNOWN. ci.json records step-level outcomes.
This supersedes the initial Linux sandbox failure. Receipt preservation also now
covers SDK contracts and recovery proofs, which maintenance previously could replace
with source-checkout evidence; prior executed step logs remain the authority there.
