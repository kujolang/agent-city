# VideoOps local production

Available in the v0.2.0-rc.3 local preview. Real browser launch, SDK roles, guarded
render, exact-candidate human approval, finalization and matching download are
verified in the [media acceptance evidence](../evidence/videoops-media-integration/README.md).
This explicit production adapter is separate from the read-only Observer and replay.

## Setup

1. Start Agent City and save a working model connection in Mission Command.
   The existing Codex subscription connector is supported; users supply their own
   authenticated CLI. Choose a model capable of coding, structured JSON and the
   supplied context. A model listing alone does not prove those capabilities.
2. Start a compatible Docker engine with seccomp and AppArmor (see engine requirements below).
3. From a source checkout, enable the verified image:

   ```sh
   npm run setup:videoops -- --build --enable --confirm-model-capabilities
   ```

   In a managed installation that includes this adapter:

   ```sh
   "$HOME/.local/share/agent-city/start.command" setup:videoops --build --enable --confirm-model-capabilities
   ```

   Use the same `CITY_RUNTIME_DIR` / `CITY_PORT_OFFSET` as your launcher.
   The explicit confirmation records your model-capability attestation. Setup
   verifies the local image/toolchain; it does not benchmark the model or run a task.
4. Restart City normally. Saved setup binds the immutable image, Docker context,
   role contracts and configured model. Changing the model requires setup again.

The measured local amd64 image is **1,260,560,574 bytes (1.26 GB / 1.17 GiB)**.
Temporary download/build cache needs additional space; other architectures/builds
may differ. The measured build took 210.72 seconds on a busy development machine.
See [build and toolchain evidence](../evidence/videoops-local-build/receipt.json).
If Docker reports `docker-credential-desktop` missing on macOS, ensure Docker's
`/Applications/Docker.app/Contents/Resources/bin` is in the build process's PATH;
do not paste credentials into arguments or remove credential configuration.

## Submit and review

Open **VideoOps production**, enter the full request, set dimensions/FPS/duration,
choose a verified media/style pack, check isolated-render consent, and choose
**Start video production**. The Pixel v2 preset uses actual game captures and a
licensed pixel font. Add your own product imagery/recordings and approved audio
through **Add your own product media** or the local registration command.
Optional ElevenLabs speech, music and SFX require separate private provider setup,
capability evidence and exact per-request consent/budgets. Nothing generates by
default; unavailable requirements block instead of being replaced.
See [media, pixel presets and optional audio](videoops-media.md).

Follow actual observed execution and inspect the mission history. Once rendered,
open **Video production review**. Watch the entire exact candidate, record your
own outcome and notes, and attest only to checks you actually performed. Technical
PASS is separate from visual/listening approval. Failure and earlier attempts remain retained.
After approval, choose **Finalize approved video**, then download the final file.
Finalization verifies the same candidate checksum; it does not publish anything.

The earlier approved pixel/Siren promo remains a separate assistant-authored
reference. Reusing its assets does not transfer its approval to a new VideoOps
candidate. The new integration uses the canonical VideoOps media runtime; live
provider capability claims are limited to actual retained receipts.

## Recovery and limits

A timeout or uncertain source outcome is not permission to launch a duplicate.
Inspect the existing mission and its receipts first. A review-incomplete result
keeps the candidate for review without rerendering it. No automatic approval is
recorded. No arbitrary host code execution, cloud rendering or external publication
is enabled. To disable saved setup, run `setup:videoops --disable` through the same
launcher (or `npm run setup:videoops -- --disable`) and restart City. Existing source
work is not interrupted by disabling future setup.

### Engine security requirements

The City Workcell adapter uses contained-standard isolation and host workspace
identity. Docker must report **seccomp and AppArmor**. Docker Desktop engines
without AppArmor cannot run these workloads, even when the image builds and its
tools run. Setup/admission rejects them before model work; do not disable policy.
A configured Linux Docker engine or a dedicated compatible Colima VM may qualify.
The verified local context is `colima-kujo-workcell`; it is an operator-owned VM,
not something the installer silently creates. Select a named context explicitly:

```sh
DOCKER_CONTEXT=colima-kujo-workcell npm run setup:videoops -- --image agent-city-videoops:0.8.141 --enable --confirm-model-capabilities
```

The image must exist in that context. Keep the default Docker context unchanged
when other workloads use it. Rootless Docker needs a separately configured
workspace identity; this City adapter does not qualify it.
