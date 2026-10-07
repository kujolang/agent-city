# Pinned local Kujo image build and real execution

`npm run setup:workcell -- --build` builds `agent-city-kujo:1.7.0` on an
operator-selected Docker engine. Dockerfile pins the Node24/Trixie manifest digest;
Kujo1.7 packages use the existing npm integrity lock. Lifecycle scripts are disabled.
Only Dockerfile/package.json/package-lock.json enter the temporary context; the
repository and private state are never sent. The command prints the immutable local
image ID for explicit launch configuration and leaves execution consent unchanged.

Real build and fresh source proof ran on dedicated Colima linux/amd64, host macOS
x64. Existing global desktop-linux context was retained. Public image metadata/build
used a private empty Docker config because the host's desktop credential helper was
missing; no user credential configuration was changed. No image was published.

`build-and-run.json` contains actual image identity, recipe hashes, container runtime
version and Workcell run. `live-world/proof.json` and screenshot retain actual
previously model-generated program execution→Watchdog→gateway→browser Follow.
Runtime1.7 produced5; all6lifecycle observations reached canonical evidence; cleanup
complete and owned container absent. No new model request. Old1.5 image evidence
remains in its original location. The dedicated VM was stopped after verification.

Full npm verify81tests, maps/boundaries/typecheck/build PASS. The default setup
command prints help without contacting the engine; --build explicitly permits
registry downloads and build execution, bounded to10minutes. No eight-hour soak.
Only Linux AMD64 was built/run. ARM64 support is not qualified; automatic engine
installation, whole-host security and fresh-machine onboarding remain open.
