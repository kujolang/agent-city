import { mountVideoopsMediaUpload } from "./videoops-media-upload";
export function mountVideoopsLaunch(
  host: HTMLElement,
  getToken: () => string,
  onStarted: (id: string) => void,
) {
  const section = document.createElement("details");
  section.innerHTML = `<summary>VideoOps production</summary><p>Creative Director → Asset Scout → optional authorized media generation → HyperFrames Editor → isolated render → visual/listening review. Choose verified product imagery and a pixel style pack. Missing media stops production; no generic replacement is invented.</p><p>Save a model connection first. Then run <code>../start.command setup:videoops --build --enable --confirm-model-capabilities</code> from the managed Agent City directory and restart City. For a source checkout use <code>npm run setup:videoops -- --build --enable --confirm-model-capabilities</code>. The confirmation attests that your selected model supports coding, structured JSON and bounded long-context inputs. Use <code>setup:videoops --disable</code> to disable saved setup. Model credentials use the saved connection above. Technical rendering does not approve the video.</p><form><label>Video production request <textarea name="prompt" maxlength="16384" required></textarea></label><label>Verified media/style pack <select name="mediaPack"><option value="">No media pack</option></select></label><p>Register original imagery, recordings, fonts and approved audio using <code>setup:videoops-media</code>. The Pixel v2 preset uses actual game captures and a licensed pixel font.</p><div class="videoops-generation"></div><label>Width <input name="width" type="number" value="640" min="256" max="1920" required></label><label>Height <input name="height" type="number" value="360" min="240" max="1920" required></label><label>FPS <select name="fps"><option>24</option><option selected>30</option><option>60</option></select></label><label>Duration in seconds <input name="durationSeconds" type="number" value="6" min="1" max="60" required></label><label><input name="allowRender" type="checkbox" required>Allow this task to render in the configured isolated Workcell.</label><button disabled>Start video production</button></form><p role="status">VideoOps setup not checked.</p>`;
  host.append(section);
  const form = section.querySelector("form")!,
    button = form.querySelector("button")!,
    state = section.querySelector<HTMLElement>('[role="status"]')!;
  const packSelect =
    form.querySelector<HTMLSelectElement>('[name="mediaPack"]')!;
  const generationHost = form.querySelector<HTMLElement>(
    ".videoops-generation",
  )!;
  mountVideoopsMediaUpload(section, getToken, (pack) => {
    let option = Array.from(packSelect.options).find(
      (o) => o.value === pack.id,
    );
    if (!option) {
      option = document.createElement("option");
      option.value = pack.id;
      option.textContent = pack.name;
      packSelect.append(option);
    }
    packSelect.value = pack.id;
  });
  let providerRevision: string | undefined;
  let loaded = false,
    loading = false;
  const generationFields: { capability: string; field: HTMLFieldSetElement }[] =
    [];
  async function loadMedia() {
    if (loaded || loading || !getToken()) return;
    loading = true;
    try {
      const response = await fetch("/control/videoops-media", {
        headers: { "X-City-Command-Token": getToken() },
      });
      if (!response.ok) throw Error("Media options unavailable");
      const media = await response.json();
      providerRevision = media.provider?.revision;
      for (const p of media.packs) {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        packSelect.append(option);
      }
      if (!packSelect.value) {
        const defaultPack = media.packs.find(
          (p: { name: string }) => p.name === "Agent City Pixel v2",
        );
        if (defaultPack) packSelect.value = defaultPack.id;
      }
      for (const c of media.provider?.capabilities ?? []) {
        const field = document.createElement("fieldset");
        const legend = document.createElement("legend");
        legend.textContent =
          "Optional ElevenLabs " +
          c.capability +
          " · " +
          c.model +
          (c.voice ? " / " + c.voice : "");
        field.append(legend);
        const controls = document.createElement("div");
        controls.innerHTML = `<label>Exact narration or sound description <textarea name="mediaText" maxlength="4096"></textarea></label><label>Audio duration (seconds) <input name="mediaDuration" type="number" min="0.5" max="60" value="6" step="0.01"></label><label>Maximum included credits <input name="mediaCredits" type="number" min="1" max="100000"></label><label>Maximum USD reservation <input name="mediaCost" type="number" min="0" max="100" step="0.01" value="0"></label><label><input name="mediaAuthorize" type="checkbox">Authorize ONE generation request for this exact text within these bounds. No automatic retries or substitutions.</label>`;
        field.append(controls);
        generationHost.append(field);
        generationFields.push({ capability: c.capability, field });
      }
      if (!generationFields.length)
        generationHost.textContent =
          "New audio generation is off. Configure a private ElevenLabs credential reference and current capability/allowance evidence with setup:videoops-provider. Existing approved audio can be supplied in a media pack without a new charge.";
      loaded = true;
    } catch {
      state.textContent =
        "Media options could not load; reopen this section to retry.";
    } finally {
      loading = false;
    }
  }
  section.addEventListener("toggle", () => {
    if (section.open) void loadMedia();
  });
  let available = false,
    pending = false;
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!available || pending) return;
    pending = true;
    button.disabled = true;
    state.textContent = "Submitting video production…";
    const data = new FormData(form);
    try {
      const response = await fetch("/control/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": getToken(),
        },
        body: JSON.stringify({
          workflow: "videoops",
          ...(packSelect.value ? { mediaPack: packSelect.value } : {}),
          ...(providerRevision
            ? { mediaProviderRevision: providerRevision }
            : {}),
          generation: generationFields
            .filter(
              ({ field }) =>
                field.querySelector<HTMLInputElement>(
                  '[name="mediaAuthorize"]',
                )!.checked,
            )
            .map(({ capability, field }) => ({
              capability,
              text: field.querySelector<HTMLTextAreaElement>(
                '[name="mediaText"]',
              )!.value,
              durationSeconds: Number(
                field.querySelector<HTMLInputElement>('[name="mediaDuration"]')!
                  .value,
              ),
              maxCredits: Number(
                field.querySelector<HTMLInputElement>('[name="mediaCredits"]')!
                  .value,
              ),
              maxCost: Number(
                field.querySelector<HTMLInputElement>('[name="mediaCost"]')!
                  .value,
              ),
              authorize: true,
            })),
          prompt: data.get("prompt"),
          width: Number(data.get("width")),
          height: Number(data.get("height")),
          fps: Number(data.get("fps")),
          durationSeconds: Number(data.get("durationSeconds")),
          allowRender: data.get("allowRender") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Video production unavailable");
      state.textContent =
        "Started " +
        result.id +
        ". Follow its observed execution; review the rendered candidate from mission history.";
      onStarted(result.id);
    } catch (error) {
      state.textContent =
        error instanceof Error ? error.message : "Video production unavailable";
    } finally {
      pending = false;
      button.disabled = !available;
    }
  };
  return (ready: boolean) => {
    available = ready;
    if (ready && section.open) void loadMedia();
    button.disabled = !ready || pending;
  };
}
