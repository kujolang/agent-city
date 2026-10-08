# Real reviewed Kujo tool and live game recording

**PASS for this bounded task.** [Watch the game-only MP4](repaired/release-notes-live.mp4)
(53.05 seconds, 768×720, nearest-neighbor upscale of the native256×240 canvas).
[Native WebM](repaired/release-notes-live.webm), [contact sheet](repaired/video-contact-sheet.png),
[actual reviewer inspector](repaired/actual-reviewer-inspector.png).
Recording starts at the first observed Workshop visit; no opening seven-second city hold.
This is live observation, not a reenactment or synthetic product proof. No page chrome,
audio, conversation panels or credentials are recorded in the video.

## Actual operation

- Mission: `mission-4696d158-a5e5-48e4-9572-4e56b75186b2`.
- SDK/Dispatch run: `run-1791445815364-7374`.
- Parent: `mission-fcb60407-155b-4f4d-942f-f754ec925ba0`.
- Workcell: `wc-ea686aa1187c4840a3a36ee3cb5ae031`.
- Source prefix: `useful-tool-`; City runtime source `ca86be9`.
- Provider: existing Codex CLI0.144.4 subscription connector, alias `codex-cli-default`.
  The underlying model ID is not reported and is not inferred. No credentials exported.
- Imported author: `kujolang/kujo-agents:chain.frontend-developer`; separate reviewer:
  `kujolang/kujo-agents:chain.code-reviewer`. Checker and Workcell host are separate
  observed execution instances. Four instances belong to this mission; AG11 in the
  session HUD also counts retained instances from earlier real attempts.

Real task intake/assignment → SDK author → local RAG → explicit MCP documentation
and source reads → actual reviewer handoff → syntax check → isolated Workcell
execution → named project-file export → exact stdout check. Lifecycle metadata flows
through the existing bounded spool/bridge, Watchdog canonical store/export, gateway
journal/SSE, pure semantic reducer/planner and Pixi. [proof.json](repaired/proof.json)
retains instance/operation/evidence identity, scene changes and actual outcomes.

Camera follows the exact author through Workshop → city → Library → Workshop →
MCP → Workshop, then explicitly selects the actual checker through city → Dojo →
Workshop. The successful recording does not claim a separate reviewer-follow segment.
The asynchronous handoff does not invent a co-located meeting. Operations may finish
before the visual visit: `FEED LIVE` is source-feed health, while the DOM inspector
separates COMPLETED truth from RECENT presentation. Dispatch workflow aggregate stays
UNKNOWN where no authoritative aggregate status exists.

## Usable deliverable

[release-notes.kujo](repaired/release-notes.kujo) reads a newline-delimited file,
trims entries, skips blanks, writes Markdown bullets and prints the result. The
[sample input](repaired/changes.txt) and [actual exported output](repaired/RELEASE-NOTES.md)
are retained. To use it in a scratch directory with Kujo installed:

```sh
mkdir -p project
cp changes.txt project/changes.txt
kujo run release-notes.kujo --interpreter
```

It overwrites `project/RELEASE-NOTES.md`. Change `project/changes.txt` to your own
release items. These are fixed local paths, not a general CLI argument parser.
The actual Workcell ran without network/host-project writes and cleaned up.
[artifact.json](repaired/artifact.json) records exit0, valid syntax, passed exact stdout,
97-byte export SHA256 `10c193d87399bf99e8364d9d0f7eb44669c370be0072b00d32c75d9dd2d317b9`.
The [senior review](repaired/senior-review.md) grades it A as model opinion and
explicitly says execution checks were still pending; those checks ran afterward.

## Retained failures and fixes

| Attempt | Actual result |
| --- | --- |
| `44a5ebe1-49ff-475b-8dc0-9eb1602ef789` | GLM cloud exhausted its output limit without usable text; task failed; no execution |
| `a1daf1fe-d001-45bd-b186-1ec7db15c281` | Small local Qwen returned malformed reviewer output; task failed; no execution |
| `fcb60407-155b-4f4d-942f-f754ec925ba0` | Codex draft/review completed; Workcell mount was unwritable; execution unverified and output check unavailable |
| `4696d158-a5e5-48e4-9572-4e56b75186b2` | Linked repair completed, actually executed and passed output check |

Workcell now defaults temporary clones to private runtime scratch under the normally
shared HOME directory; no container privileges or host mounts were widened. A separate
real diagnostic after the scratch fix reached Kujo and reported built-in `input`
name collision. That observed error was supplied to the repair agents, which generated
the final `release_` variables. The implementation engineer did not substitute a
handwritten final tool. The diagnostic is not misrepresented as the parent's original run.

Historical capture setup/timeout failures are under `capture-failures/`; the old
`recordingBeginsAtFirstWorkshopObservation:true` constant there is not proof that
capture started. The corrected harness records the actual flag and actual reviewer
commentary. The source was allowed to finish when capture failed. Failed videos and
receipts remain in `local-attempt/`, `codex-attempt/` and `failed-cloud/`.

## Replay, privacy, inspection and capture limits

[session-replay.json](session-replay.json) is the normalized redacted journal:
77events,11instances, partial coverage, pinned protocol/adapter/core/map/profile data.
Two offline runs of `scripts/replay.ts` produced byte-identical output and semantic
hash `770921f19f7a9153848d709d9b9074193c78b52f55deac5370caf609389cc06c`.
No provider, MCP, Workcell or source writes occur during replay. Raw task prompts and
project content are absent from this journal; the separately authorized demo artifact
and review files contain the tool's actual content.

The recorded journal honestly retains a schema gap for the named nested export.
The final gateway fix accepts bounded relative artifact/repository reference segments,
while still rejecting traversal, URLs, whitespace, encoded content and unsafe ordinary
metadata. `tests/fixtures/real-nested-artifact.json` preserves that exact canonical
record; regression proves its unchanged evidence reaches semantic truth. **The old
journal/video has not been rewritten or falsely marked complete.** Missing lifecycle
starts and unknown aggregate statuses remain unknown.

[inspector.json](repaired/inspector.json):24read-only roster selections over the
actual four-instance mission, p50/p95 17.6/70.5ms to next-frame DOM identity;
truth unchanged, no POST requests. Capture uses explicitly selected SwiftShader in
an isolated trusted-localhost Chromium because this Mac's Metal backend is slow even
for bare WebGL. This does not change application/browser defaults or qualify every
GPU. See [performance scope](../performance-current/README.md).
