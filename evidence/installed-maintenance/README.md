# Installed maintenance acceptance

Local macOS x64 proof passed against the owned fresh model installation after its
launcher stopped. The test preserved106 runtime files byte-for-byte, including
actual completed mission output and provider configuration, across a real pinned
update, retained backup, archive uninstall and restoration to the original path.
No credential values are copied into this report. Repeat install, active lease
and failed-preparation refusal checks also passed. This local installation used
system Node; private-Node retention must be established by the CI matrix.

CI run37707496087 at4f3af6c passed Linux x64/ARM64 and macOS Intel/ARM64.
Each runner bootstrapped private Node, installed the pinned source/runtime stack,
passed installed SDK/Dispatch/RAG/MCP contracts, and ran all five maintenance
checks. Each retained116 runtime files and its private Node runtime. See run.json
and the four installation-*.json receipts. This matrix does not contact a model
or enable Workcell execution; those require separate onboarding evidence.
