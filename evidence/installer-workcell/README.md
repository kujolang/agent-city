# Managed installer Workcell source proof

The previous managed installer omitted Workcell entirely. This installation adds
its pinned source without enabling execution, provisioning containers, or installing
optional cloud-adapter dependencies. Exact required producer validation rejects a
same-count substitution as well as a missing producer before staging any download.

`proof.json` retains the actual receipt, archive hashes and installed CLI/native
cancellation checks. Install command was `node installer/install.mjs --prefix
<new isolated destination> --no-start`. Checks ran against that destination's Kujo
binary and Workcell source, not the development siblings. Installer/lifecycle
unit tests8/8 and TypeScript passed. The disposable installation was removed after
verification; no pre-existing installation was touched.

Scope: existing macOS arm64 development host. Not clean-machine, cross-platform,
first-model task, container/image provisioning, or public-distribution qualification.
