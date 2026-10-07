# Managed local installation (preview)

Public distribution and clean-platform qualification are still blocked. Do not
advertise these commands as a qualified public installer. From a trusted source
checkout with Node 24+, install into an isolated directory:

```sh
node installer/install.mjs --prefix "$HOME/.local/share/agent-city" --no-start
"$HOME/.local/share/agent-city/start.command"
```

The installation includes pinned Workcell source alongside the other Kujo
producers. Existing managed installations need an update to receive it. This
does not install a container engine, pull an image, install optional cloud-adapter
dependencies, or enable code execution. To use isolated Kujo execution, first
configure a supported local container backend and a trusted, already-local image
with Kujo. Set `CITY_ENABLE_WORKCELL=1` and `CITY_WORKCELL_IMAGE` before launching;
set `DOCKER_CONTEXT` and `CITY_WORKCELL_TMPDIR` when required by that backend.
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
