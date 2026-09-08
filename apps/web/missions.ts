export function mountMissions(host: HTMLElement) {
  const panel = document.createElement("section");
  panel.className = "mission-panel";
  panel.innerHTML = `<h2>MISSION COMMAND</h2><p id="mission-status" role="status">Checking model connection…</p>
    <details><summary>Model connection</summary><form id="model-form">
    <label>Chat completions endpoint <input name="endpoint" type="url" required placeholder="Full HTTPS or local HTTP endpoint"></label>
    <label>Model <input name="model" required autocomplete="off"></label>
    <label>API key <input name="apiKey" type="password" autocomplete="off" placeholder="Optional for local models"></label>
    <p class="muted">Saved only in a private local configuration file. A blank key keeps the saved key only for the same endpoint.</p>
    <button type="submit">Save connection</button></form></details>
    <form id="mission-form"><label>Task type <select name="kind"><option value="writing">Writing + review</option><option value="code">Code + review</option></select></label>
    <label>Task <textarea name="prompt" rows="3" maxlength="16384" required placeholder="Describe the small task you want the agents to complete."></textarea></label>
    <button type="submit" disabled>Start mission</button></form>
    <p class="muted">Sends your task to the configured model. The SDK hands the draft to a reviewer. Code is saved for review; it is not executed.</p>
    <div id="mission-jobs" aria-label="Mission history"></div><pre id="mission-artifact" tabindex="0" aria-label="Selected mission output"></pre>`;
  host.querySelector(".world")!.after(panel);
  const form = panel.querySelector<HTMLFormElement>("#mission-form")!;
  const modelForm = panel.querySelector<HTMLFormElement>("#model-form")!;
  const submit = form.querySelector("button")!;
  const status = panel.querySelector<HTMLElement>("#mission-status")!;
  const output = panel.querySelector<HTMLElement>("#mission-artifact")!;
  const history = panel.querySelector<HTMLElement>("#mission-jobs")!;
  let token = "",
    pending = false,
    historyKey = "",
    replay = false,
    configLoaded = false;
  async function refresh() {
    try {
      const response = await fetch("/control/status");
      if (!response.ok) throw Error();
      const data = await response.json();
      token = data.token;
      if (!pending)
        status.textContent = data.configured
          ? `MODEL / ${data.model}${data.busy ? " · Mission running" : " · Configured"}`
          : "MODEL NOT CONFIGURED · Open Model connection to configure your provider.";
      submit.disabled = replay || pending || data.busy || !data.configured;
      if (replay)
        status.textContent =
          "REPLAY · Mission commands disabled. Return to Live to start new work.";
      if (!configLoaded) {
        (modelForm.elements.namedItem("endpoint") as HTMLInputElement).value =
          data.endpoint;
        (modelForm.elements.namedItem("model") as HTMLInputElement).value =
          data.model || "";
        configLoaded = true;
      }
      const key = JSON.stringify(data.jobs);
      if (key !== historyKey) {
        historyKey = key;
        history.replaceChildren();
        for (const job of data.jobs) {
          const button = document.createElement("button");
          button.textContent = `${job.kind} / ${job.status} / ${job.id.slice(-8)}`;
          button.disabled = job.status !== "completed";
          button.onclick = async () => {
            try {
              const response = await fetch(
                "/control/artifact/" + encodeURIComponent(job.id),
              );
              if (!response.ok) throw Error();
              const artifact = await response.json();
              output.textContent = artifact.content;
            } catch {
              output.textContent = "Artifact unavailable; no result inferred.";
            }
          };
          history.append(button);
        }
      }
    } catch {
      if (!pending)
        status.textContent =
          "MISSION SERVICE UNAVAILABLE · Start the local launcher to connect.";
      submit.disabled = true;
    }
  }
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (replay) return;
    pending = true;
    submit.disabled = true;
    const fields = new FormData(form);
    try {
      const response = await fetch("/control/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: JSON.stringify({
          kind: fields.get("kind"),
          prompt: fields.get("prompt"),
        }),
      });
      const result = await response.json();
      status.textContent = response.ok
        ? `Mission accepted: ${result.id}`
        : result.error;
    } catch {
      status.textContent =
        "Submission response unavailable. Check mission history before retrying.";
    } finally {
      pending = false;
    }
  };
  modelForm.onsubmit = async (event) => {
    event.preventDefault();
    if (replay) return;
    pending = true;
    const fields = new FormData(modelForm);
    try {
      const response = await fetch("/control/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: JSON.stringify({
          endpoint: fields.get("endpoint"),
          model: fields.get("model"),
          apiKey: fields.get("apiKey"),
        }),
      });
      const result = await response.json();
      status.textContent = response.ok
        ? "Connection saved. A mission will verify provider access."
        : result.error;
    } catch {
      status.textContent = "Connection could not be saved.";
    } finally {
      (modelForm.elements.namedItem("apiKey") as HTMLInputElement).value = "";
      pending = false;
    }
  };
  void refresh();
  setInterval(() => {
    if (!document.hidden && !pending) void refresh();
  }, 3000);
  return {
    setReplay(value: boolean) {
      replay = value;
      submit.disabled = true;
      modelForm.querySelector("button")!.disabled = value;
      void refresh();
    },
  };
}
