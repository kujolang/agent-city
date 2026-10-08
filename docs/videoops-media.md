# Product imagery and optional audio in VideoOps

VideoOps can reuse original product imagery, recordings, fonts and approved audio. A selected media pack supplies verified local files and style guidance to the Creative Director, Asset Scout and Editor. Optional new speech, music and sound effects use the canonical Kujo VideoOps ElevenLabs adapters with separate authorization for each request.

A style preset is guidance, not a guarantee that a new render matches an approved reference. Watch and listen to the exact new candidate before approving it.

## Start with the Pixel v2 pack

First save your model connection in Mission Command and complete the existing [VideoOps setup](videoops.md). From a source checkout:

```sh
npm run setup:videoops-media -- --builtin pixel-v2
```

For a managed installation, run this from its Agent City directory:

```sh
../start.command setup:videoops-media --builtin pixel-v2
```

Use the same runtime selection you use to launch City. The command prints a content-addressed pack ID and registers the files privately under that runtime's `videoops-media-packs` directory. It makes no provider request and grants no generation or publication permission.

In Mission Command, open **VideoOps production** and choose **Agent City Pixel v2** in the media/style pack selector. The pack contains actual city, Library and Workshop captures plus Press Start 2P and its SIL Open Font License. It includes no voice, music or sound effects. Its guidance asks the Editor to use those backgrounds and pixel typography instead of reconstructing a generic city.

These are historical product captures. Their presence in a new video does not prove a new live agent operation. If the narrative claims a particular run happened, supply evidence and footage from that run.

## Supply your own media

The local media-upload controls accept explicit file selections and an operator rights statement. They accept at most eight files, at most 4 MiB per file and 12 MiB total. Supported files are PNG, JPG/JPEG, WebP, MP4, WebM, MP3, WAV, OGG, M4A, TTF, WOFF and WOFF2. Uploads do not fetch URLs or read arbitrary server paths.

Audio files need an explicit role (`voice`, `music` or `sfx`) and a declared duration in seconds. Descriptions are not used to infer the role. Only upload files you are entitled to use. A rights statement records your attestation; it is not an independent license audit. Uploaded footage is reference media unless separately supported by current run evidence.

For larger files, or a pack combining product captures, a font and existing approved audio, use the local operator CLI:

```sh
npm run setup:videoops-media -- --source /absolute/path/to/media-root --manifest /absolute/path/to/pack.json
```

Managed installs use `../start.command setup:videoops-media` with the same flags. Optional `--registry DIR` selects another private registry; it must match the registry used by the intended City runtime to appear in that runtime's selector.

The local manifest route permits at most 64 media files, 16 MiB per file and 64 MiB total. It validates hashes and sizes, rejects redirected paths and preserves license text. Files must use the allowed relative `assets/source/`, `assets/captured/`, `assets/generated/`, `assets/normalized/`, `assets/audio/` or `assets/fonts/` paths. It copies explicit files only, never scans an entire source directory. Registration and every subsequent staging operation verify the bytes.

Use `assets/videoops/pixel-v2/pack.json` as the manifest example. Its schema is `agent-city.videoops-media-pack.v1`, with `name`, `styleIntake`, `assets` and `licenses`. Every asset declares:

- `id`, `path`, lowercase SHA-256, exact `bytes`, `rightsEvidence` and `description`.
- Optional `sourceType`: `product-capture`, `font` or `approved-local`.
- For MP3/WAV/OGG/M4A, required `audioRole` and positive `durationSeconds`, no more than 600 seconds.

Each license entry supplies a `licenses/NAME.txt` path, hash and byte count. Keep actual license texts and generation receipts with the production's evidence. Reusing previously generated audio does not make a new provider call; its existing rights and intended use must still permit reuse.

## Configure optional ElevenLabs generation

Provider configuration is separate from the agent's model connection. It stores a credential **reference**, current operator evidence and permitted capabilities. Never put an API key in a production prompt, upload, rights statement or JSON config.

The private config below matches the accepted shape. Replace every placeholder with your own verified values before saving it. In particular, replace the expiry with an ISO UTC time later than now and within the next 24 hours, and replace the zero allowance with your evidenced current included-credit allowance. Zero safely permits no generation reservation.

```json
{
  "credential": {
    "kind": "env",
    "name": "ELEVENLABS_API_KEY",
    "account": null
  },
  "expiresAt": "REPLACE_WITH_UTC_EXPIRY_WITHIN_NEXT_24_HOURS",
  "remainingCredits": 0,
  "noOverage": true,
  "evidence": "REPLACE_WITH_CURRENT_ACCOUNT_ALLOWANCE_AND_NO_OVERAGE_EVIDENCE",
  "rights": "REPLACE_WITH_RIGHTS_AND_PERMITTED_INTENDED_USE",
  "capabilities": {
    "speech": {
      "model": "YOUR_SUPPORTED_SPEECH_MODEL",
      "voice": "YOUR_AUTHORIZED_VOICE_ID",
      "entitlementEvidence": "REPLACE_WITH_CURRENT_SPEECH_MODEL_AND_VOICE_ACCESS_EVIDENCE"
    }
  }
}
```

The referenced environment variable must be available to the City process. Alternatively use `kind: "keychain"` or `kind: "secret-service"` with your own service `name` and `account` (or `null` where appropriate). No personal Keychain service or voice is supplied as a default. Secret lookup happens inside the provider runtime; browser options expose neither the key nor its storage reference.

Protect and save the file, then restart City:

```sh
chmod 600 /absolute/path/to/private-provider.json
npm run setup:videoops-provider -- --config /absolute/path/to/private-provider.json
```

For managed installations:

```sh
../start.command setup:videoops-provider --config /absolute/path/to/private-provider.json
```

The setup command validates and saves references. It does **not** contact ElevenLabs or independently prove entitlement. Account tier or a working speech call does not establish access to music, SFX, a different model or a particular voice.

Add `music` and/or `sound_effects` capability entries only when supported by current evidence. Each entry has exactly `model`, `voice` and `entitlementEvidence`; `voice` must be `null` for those two capabilities. Speech requires a voice ID. Do not invent capability evidence to make a control appear.

For each new generation in Mission Command, provide the exact narration or sound description, duration, maximum included credits and maximum USD reservation, then check its explicit authorization box. At most one request per capability is admitted for a mission. Speech supports a requested duration from 0.5 to 60 seconds, music 3 to 60 seconds, and SFX 0.5 to 30 seconds. These are request bounds, not promises of the actual generated duration.

The sum of credit reservations must fit the evidenced remaining allowance. Evidence must still be current when the mission is admitted. `noOverage` must be true. The native runtime records exact request authorization and receipts. Model output cannot authorize spending, choose another credential or silently retry a provider call.

Unchecked optional generation stays off. If you require audio, provide approved files or explicitly authorize it; the system must not silently replace unavailable ElevenLabs output with another provider, synthesized audio or silence. An ambiguous provider result remains **UNKNOWN** and requires reconciliation before another attempt. Inspect the private media ledger and source evidence; do not repeatedly submit the same task to work around an uncertain charge.

## Review the finished candidate

The Editor owns composition and mixing. Audio productions require a declared mix plan, source provenance and technical audio checks, including clipping and true-peak limits. When voice and music coexist, the declared music gain is limited to support narration. These checks do not establish intelligibility or prove that every declared stem is perceptually present.

Play the exact candidate from beginning to end with sound. Check backgrounds, pixel text, pronunciation, timing, balance, missing audio and accidental content. Visual playback and listening remain mandatory human review gates. An earlier promo approval or a technical PASS does not approve this new file; approval must refer to the exact candidate checksum.

A practical first production is a six-second piece using Pixel v2, an explicitly supplied approved voice/music pack or separately authorized new audio, and a short factual script. Select the pack, write the request, allow the isolated render, submit, follow the real observed stages and review the resulting candidate in mission history. Publication remains a separate action after review.

## Host checks and footage audio

Setup and mission admission check the canonical offline media runtime before model work. The host needs Python 3.10 or newer with `jsonschema`, plus `ffmpeg` and `ffprobe`; the Docker image alone does not supply host review tools. Use a Python environment containing the canonical `kujo-agents/videoops/tools` dependencies on your launcher PATH. Setup registers the Pixel v2 pack, which the form selects by default; choose another pack or no media explicitly when appropriate.

Footage with embedded audio is currently rejected before model work. Supply silent product footage and separate voice/music/SFX stems with explicit roles and measured durations. Narration must fit in full. Provider configuration changes invalidate an old browser consent: reload and review the displayed model and voice again.
