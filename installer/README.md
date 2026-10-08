# Managed local installation (preview)

The repository is public. The versioned preview bootstrap pins an immutable City
revision and pinned producer/runtime dependencies into an isolated directory.
Production release gates remain incomplete; see ../RELEASE-CHECKLIST.md.

Install and launch the local preview on macOS or Linux:

```sh
curl --proto '=https' --tlsv1.2 -fsSL https://github.com/kujolang/agent-city/releases/download/v0.2.0-rc.2/install.sh | sh
```

The bootstrap supplies a private Node runtime when needed. It does not configure
model credentials or start agent tasks. Ctrl+C stops the application. To install
without launching, append `-s -- --no-start` to `sh`. The default launcher is
`~/.local/share/agent-city/start.command`.

The launcher also runs setup commands with the installed private Node/npm, even
when no system-wide Node is installed:

```sh
"$HOME/.local/share/agent-city/start.command" doctor --json
"$HOME/.local/share/agent-city/start.command" --help
```

After `codex login`, start the Codex adapter in another terminal with
`"$HOME/.local/share/agent-city/start.command" provider:codex`. Set `CITY_APP_URL`
to the displayed app URL if needed, or pass the same `CITY_PORT_OFFSET` as the app. With neither override, the connector targets the normal launcher port5178. This does not install
Codex or sign in for you. For Ollama, use **Detect local Ollama** in Mission
Command, choose an installed model, then save the connection. Local Ollama does
not require a City API key; remote/cloud authentication remains provider-owned.

The pinned agent catalog is included as data. To make its profiles available in
Mission Command, import it explicitly with the same `CITY_PORT_OFFSET` or
`CITY_RUNTIME_DIR` as your app:

```sh
"$HOME/.local/share/agent-city/start.command" agents:import
```

Then refresh **Agent profiles / teams** and **Custom author / reviewer**. Import
preserves contract identities, capabilities, workflow references and hashes; it
runs no model or tools and creates no city citizens. Only eligible PROPOSE
profiles can be selected for the existing draft/review adapter. Other declared
workflows and tool permissions are not enabled by importing them. You can keep
using the built-in author/reviewer without importing a catalog.

From a trusted source checkout with Node 24+, the equivalent explicit install is:

```sh
node installer/install.mjs --prefix "$HOME/.local/share/agent-city" --no-start
"$HOME/.local/share/agent-city/start.command"
```

The installation includes pinned Workcell source alongside the other Kujo
producers. Existing managed installations need an update to receive it. This
does not install a container engine, pull an image, install optional cloud-adapter
dependencies, or enable code execution. To use isolated Kujo execution, first
configure a supported local container backend and a trusted, already-local image
with Kujo. For Docker, the saved setup command below builds/selects the image and
remembers its immutable ID and context. Restart normally afterward. Podman remains
manually configured with `CITY_ENABLE_WORKCELL=1` and `CITY_WORKCELL_IMAGE`;
set its backend connection and `CITY_WORKCELL_TMPDIR` when required.
Each mission still requires explicit execution consent in Mission Command.
Missing backend/image configuration must be resolved before attempting execution.

The current Workcell pin includes verified native cancellation handling. Its
optional cloud adapters retain unresolved dependency audit findings and are not
qualified by this installation. The isolated macOS installation proof establishes
source/runtime availability, not automatic sandbox setup or clean-machine support.

Stop the launcher with Ctrl+C before maintenance. From the trusted **new release
source checkout**, update the existing installation:

```sh
node installer/install.mjs --prefix "$HOME/.local/share/agent-city" --update
```

Update downloads pinned producer/runtime dependencies, builds in a separate
staging directory, cold-copies `.runtime` (missions, model configuration,
journals and instance state), and activates at the same original path. This
preserves absolute evidence references. A complete previous installation remains
at the printed `.archive-UUID` path. Other custom files remain in that archive;
external directories configured through environment variables are not migrated.
Update never starts a mission or launches the app automatically. Start it manually
and verify your provider configuration. A failed preparation leaves the old
installation untouched. Activation failure attempts to restore the old directory.

Archive/uninstall a stopped managed installation:

```sh
node installer/install.mjs --prefix "$HOME/.local/share/agent-city" --uninstall
```

This removes the active installation path by renaming the entire directory to
the printed archive path. It does **not** delete saved work or credentials, remove
system Node/Ollama/Codex, change shell profiles, or stop unrelated processes.
Archives contain private configuration: keep them private. To restore, stop all
City processes and rename the archive to its original installation path (which
must be absent). To roll back an update, first archive the current installation
with `--uninstall`, then restore the previous archive. Do not run a backup in place:
its historical evidence still points to the original installation path.

Managed `npm start` and maintenance share an exclusive lock. Recorded live service
PIDs also prevent maintenance. After a crash, the lock is deliberately not stolen:
inspect its `owner.json`, verify the entire City process tree has stopped, then
remove that exact lock directory. Do not run direct service scripts concurrently
with maintenance. These commands preserve data but are not backups to another disk.

When a mission explicitly requests Workcell execution, admission checks the pinned
source, selected Docker/Podman connection and local image before creating the
mission or contacting the model. Checks are read-only and bounded; no image pull
or container start occurs. An available image is not proof of compatible Kujo,
security-policy acceptance or successful execution; Workcell still validates and
reports actual execution/cleanup separately. Ordinary non-execution missions do
not depend on container availability.

In Mission Command, expand **Workcell execution setup** and choose **Check Workcell
setup** before preparing a task. It works without a model connection and reports
operator configuration, engine or local-image problems without granting consent.
The displayed result describes that check only; mission admission rechecks setup.

To build the supplied local Kujo image after starting Docker, run from the Agent
City directory:

```sh
../start.command setup:workcell --build --enable
```

This explicit build downloads a digest-pinned Node/Debian base and installs Kujo
1.7.0 from the integrity-locked runtime manifest with lifecycle scripts disabled.
Only the Dockerfile and two runtime manifests enter its temporary build context.
No project files, credentials or agent tasks are copied into the image. The build
runs Kujo's version check and records image identity/input hashes privately in
`.runtime/workcell-image.json`. It does not start/install Docker, change context,
publish the image or submit a task. With `--enable`, it saves the immutable image ID
and selected named Docker context privately for this City instance. Restart with
`../start.command` normally, then use **Check Workcell setup** in Mission Command.
Every task still needs its own execution checkbox. Failed checks never replace
saved setup. A previous valid setup remains unchanged on failure.

Use the command shown inside your app to target its exact runtime directory. If
using `CITY_PORT_OFFSET` or `CITY_RUNTIME_DIR` manually, pass the same setting to
setup and start. Saved settings stay inside that runtime and survive managed updates.
An existing trusted local image can be selected without rebuilding:

```sh
../start.command setup:workcell --image agent-city-kujo:1.7.0 --enable
```

To remove the saved execution grant, run `../start.command setup:workcell --disable`
and restart City. This does not interrupt current work. An explicit launch setting
`CITY_ENABLE_WORKCELL=0` overrides saved enablement; remove an existing
`CITY_ENABLE_WORKCELL=1` override when using saved disable. Explicit image/context
launch overrides also remain authoritative. Raw `DOCKER_HOST` is not saved: use a
named context for persistent setup. The global Docker context is never changed.

Omit `--enable` when you only want to build an image. Build receipts alone never
activate code execution. Invalid, symlinked or non-private saved settings fail closed;
`--disable` writes a fresh disabled configuration without contacting Docker.

Image creation alone does not qualify host isolation/security policy. Use the
setup check and an explicitly consented test mission to inspect actual results.
The supplied builder currently targets Docker; Podman setup remains operator-owned.

For a stopped supervisor with an interrupted local Workcell run, use the exact
source repository, temporary root and run ID from that run's receipt:

```sh
../start.command recover:workcell /absolute/workcell-source /absolute/temporary-root wc-RUNID --apply
```

This refuses active containers and mismatched ownership. It removes only that
stopped run's container/workspace and writes a separate `city-cleanup.json` next
to its source receipt. UNKNOWN workload truth remains UNKNOWN; cleanup does not
prove task completion or permit a source retry. Engine unavailability refuses
cleanup. It does not clear an UNKNOWN mission's admission block automatically.
