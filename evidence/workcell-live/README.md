# Real local Workcell execution — 2026-10-07

Scope: actual isolated CLI work, not a new browser traversal, Mission Command
capability, public installer qualification or Workcell release certification.
No producer repository changed. No image was pulled or published.

## Results

[Sanitized receipt evidence](results.json) retains all three attempts:

- `wc-59f3150debc043e4a9f2ab45fee706e8`: actual container workload failed with
  permission denied because the default macOS temporary directory was not shared
  with the VM. Original receipt remains; no success was inferred.
- `wc-2e71157d91494a408b4f246d491950ad`: shared workspace retry completed and
  exported the actual 35-byte text artifact.
- `wc-937c7b1fbe254506a210171029c77280`: previously model-generated/reviewed
  `evidence/profile-kujo/real/reviewed.kujo` executed and exported `5\n` plus
  `kujo 1.5.0\n`. Its author/reviewer mission was
  `mission-91254932-2d6e-4b1b-9716-ca09e4b9395b`.

Workcell receipt/manifest verification passed for both successful runs. Workspace
removal was checked. The dedicated VM was stopped afterward; the user's active
Docker context remained `desktop-linux`. No eight-hour soak ran.

CaseFile preserved the resolved mount failure at local ignored path
`.casefile/2026-10-07-155653-workcellcolimaunsharedtemp`; its original log and
bundle were verified. Runtime receipts remain under the paths in results.json.

## Explicit local setup

Requires an already configured Docker/Colima backend that passes Workcell doctor,
the sibling Workcell/Kujo repositories, and a trusted local image containing Kujo.
The tested backend was `colima-kujo-workcell`, with AppArmor and builtin seccomp.
Do not disable protections if a different backend fails preflight.

```sh
# Start only your configured dedicated VM when needed.
colima start kujo-workcell --activate=false
mkdir -p "$PWD/.runtime/workcell-qualified/tmp"
DOCKER_CONTEXT=colima-kujo-workcell \
CITY_WORKCELL_TMPDIR="$PWD/.runtime/workcell-qualified/tmp" \
CITY_RUNTIME_DIR=.runtime/workcell-kujo-qualified \
CITY_WORKCELL_IMAGE=kujolang/workcell-kujo:tribunal-kujo-1.5.0-cc2d7db \
CITY_WORKCELL_KUJO_FILE="$PWD/evidence/profile-kujo/real/reviewed.kujo" \
npm run workcell
colima stop kujo-workcell
```

`CITY_WORKCELL_TMPDIR` applies only to spawned commands, avoiding a long parent
Node IPC socket path. The directory must exist and be shared with the VM.
`KUJO_BIN` can explicitly select the host executable. Omitting the Kujo input
retains the original tiny text-artifact proof. Input is copied into the dedicated
proof repository, capped at64KiB; its content is never interpolated into a shell
command. Workcell runs the fixed command in its bounded disposable workspace.

## Limits

Host Kujo was1.7.0; the already-local image contains1.5.0. This simple program
passing is not full version compatibility qualification. Image provenance was
local; no signature verification or registry authentication was established.
Workcell enforced network none, non-root workload, read-only root, dropped
capabilities, no-new-privileges and30-second workload timeout. Host CLI startup
is not yet bounded by this adapter. Mission Command general Workcell permission,
interruption and recovery integration remains open. The installer does not gain
this image or backend automatically.
