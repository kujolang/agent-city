# Explicit project edits and returned files

The direct proof uses actual Kujo1.7/Workcell to read a copied text input, change
that copy, export the explicitly named file and preserve its before/after hashes.
No host project is mounted or overwritten. The same receipt is then read after
a simulated pending-record checkpoint; recovery reconstructs the exact output
without another execution. Original input snapshots remain unchanged.

Run CITY_PROJECT_EXPORT_PROOF=1 with the configured scripts/workcell-project-proof.ts.
The local run used the owned colima-kujo-workcell engine and configured workspace
TMPDIR. This is real container execution of controlled code, not a model claim.

Unit checks reject traversal/Git policy/conflicting names, missing execution
consent, oversized or invalid text and mismatched bytes. Receipt checks cover
nested artifacts and symlinked parent rejection. Browser checks cover explicit
names, reset and retained-artifact inspection. Actual model and downloaded bundle
evidence are recorded separately when completed.

CI37732516195 ata22df58 passes all5jobs and108source tests. Linuxx64 and ARM64
both execute the file-edit/export branch and re-read its receipt without rerunning.
installed-x64.json and installed-arm.json are the corresponding fresh artifacts.
The corrected per-file policy uses the supported max_depth1; the invalid-depth
attempt remains separately recorded in ../project-exports-real/prior-attempts.json.
