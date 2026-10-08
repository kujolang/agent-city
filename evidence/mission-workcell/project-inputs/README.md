# Explicit project input execution

The actual Workcell proof stages a selected text file under project/ and runs a
Kujo program that reads it with read_file. The receipt proves execution, exact
stdout, Kujo1.7.0 and cleanup; private project name/size/hash references match.
Lifecycle observations contain neither file text nor its path. No model or browser
activity is claimed by this direct integration test.

Run scripts/workcell-project-proof.ts with explicit CITY_ENABLE_WORKCELL=1 and a
trusted CITY_WORKCELL_IMAGE. The local proof used the dedicated colima-kujo-workcell
Docker context and the configured CITY_WORKCELL_TMPDIR under .runtime.
The first attempt omitted that host-specific temporary path and failed to write
runtime-version.txt (permission denied). Its receipt remains at
.runtime/project-execution-4ba95421-ce46-4fd5-ac55-42a4247cca75/workcell/workcell-source/
.workcell/runs/wc-23c1f36b50524bec96a427a1c2f32d84/receipt.json.
The corrected run is recorded in proof.json; it did not relax container protections.

Unit tests cover separate consent, invalid layouts, reserved Git control files,
byte-preserving staging, and refusal to follow an existing tree or symlink. The
retained real-artifact browser proof additionally checks submission and permission
reset. This does not qualify arbitrary host project editing or general workflows.

CI37730251972 atd877665 passes all5jobs, including real copied-input Workcell
execution on Linux x64 and ARM64. installed-x64.json and installed-arm.json are
fresh receipts extracted from the respective job artifacts. They prove container
execution only; actual model qualification is in ../project-execution-real.

Current CI37730702864 at655e029 passes all5jobs after the macOS fixture admission
race correction, including the new fenced-review/malformed-output checks on all4
platforms and copied-input execution on both Linux architectures. See ci.json.
