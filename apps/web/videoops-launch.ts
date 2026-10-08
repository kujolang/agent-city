export function mountVideoopsLaunch(
  host: HTMLElement,
  getToken: () => string,
  onStarted: (id: string) => void,
) {
  const section = document.createElement("details");
  section.innerHTML = `<summary>VideoOps production</summary><p>Creative Director → Asset Scout → HyperFrames Editor → isolated render → human review. This launch flow supplies no external media, audio or generation grants. Requests requiring those assets stop explicitly. Your full request is retained.</p><p>Requires a private operator configuration in CITY_VIDEOOPS_CONFIG with the immutable VideoOps image and admitted role capabilities. Model credentials use the saved connection above. Technical rendering does not approve the video.</p><form><label>Video production request <textarea name="prompt" maxlength="16384" required></textarea></label><label>Width <input name="width" type="number" value="640" min="256" max="1920" required></label><label>Height <input name="height" type="number" value="360" min="240" max="1920" required></label><label>FPS <select name="fps"><option>24</option><option selected>30</option><option>60</option></select></label><label>Duration in seconds <input name="durationSeconds" type="number" value="6" min="1" max="60" required></label><label><input name="allowRender" type="checkbox" required>Allow this task to render in the configured isolated Workcell.</label><button disabled>Start video production</button></form><p role="status">VideoOps setup not checked.</p>`;
  host.append(section);
  const form = section.querySelector("form")!,
    button = form.querySelector("button")!,
    state = section.querySelector<HTMLElement>('[role="status"]')!;
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
    button.disabled = !ready || pending;
  };
}
