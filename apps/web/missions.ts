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
    <label><input type="checkbox" name="useLocalDocs"> Use indexed local Kujo docs</label>
    <label>Task <textarea name="prompt" rows="3" maxlength="16384" required placeholder="Describe the small task you want the agents to complete."></textarea></label>
    <details><summary>Optional JavaScript function checks</summary><label>Function contract JSON <textarea name="functionContract" rows="4" placeholder='{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0}]}'></textarea></label><p class="muted">Explicitly runs the generated module in a disposable browser worker. JSON arguments/results only; no filesystem or network integrations. Requires installed Chromium. Each case gets 1.5 seconds.</p></details>
    <button type="submit" disabled>Start mission</button></form>
    <p class="muted">Sends your task to the configured model. The SDK hands the draft to a reviewer. Code runs only when explicit function cases are supplied, in an isolated browser without host integrations.</p>
    <div id="mission-jobs" aria-label="Mission history"></div><pre id="mission-exchanges" tabindex="0" aria-label="Observed agent responses"></pre><pre id="mission-artifact" tabindex="0" aria-label="Selected mission output"></pre>`;
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
      submit.disabled =
        replay ||
        pending ||
        data.busy ||
        !data.configured ||
        !data.storageHealthy;
      if (!data.storageHealthy)
        status.textContent =
          "MISSION STORAGE UNAVAILABLE · Commands disabled to preserve evidence.";
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

          button.onclick = async () => {
            try {
              const response = await fetch(
                "/control/exchanges/" + encodeURIComponent(job.id),
              );
              if (!response.ok) throw Error();
              const exchanges = await response.json();
              panel.querySelector("#mission-exchanges")!.textContent =
                (exchanges.recordingComplete
                  ? "RECORDED MODEL RESPONSES"
                  : "PARTIAL / UNKNOWN RESPONSE COVERAGE") +
                "\n\n" +
                exchanges.records
                  .map(
                    (entry: any) =>
                      `${entry.producer}:${entry.run}:${entry.agent} / response ${entry.requestOrdinal}\n${entry.content}`,
                  )
                  .join("\n\n");
            } catch {
              panel.querySelector("#mission-exchanges")!.textContent =
                "Response history unavailable; no dialogue inferred.";
            }
            if (job.status !== "completed") {
              output.textContent = `Mission ${job.status}; no completed artifact claimed.`;
              return;
            }
            try {
              const response = await fetch(
                "/control/artifact/" + encodeURIComponent(job.id),
              );
              if (!response.ok) throw Error();
              const artifact = await response.json();
              output.textContent =
                (artifact.kind === "code"
                  ? `SYNTAX: ${artifact.validation?.syntax?.toUpperCase() || "UNKNOWN"} · FUNCTIONAL TESTS: ${(artifact.validation?.functionalTests || "not-run").toUpperCase()} · ${artifact.codeExecuted === null ? "EXECUTION COVERAGE UNKNOWN" : artifact.codeExecuted ? "EXECUTED IN ISOLATED BROWSER" : "CODE NOT EXECUTED"}\n${artifact.validation?.fenceRemoved ? "Outer Markdown fence removed; original response retained above.\n" : ""}\n`
                  : "MODEL-REVIEWED TEXT · FACTUAL ACCURACY NOT VERIFIED\n\n") +
                artifact.content +
                (artifact.functional
                  ? "\n\nFUNCTION CHECKS\n" +
                    artifact.functional.cases
                      .map((c: any) => `${c.name}: ${c.status} / ${c.reason}`)
                      .join("\n")
                  : "");
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
      const contract = String(fields.get("functionContract") || "").trim();
      let functionContract;
      if (contract) {
        try {
          functionContract = JSON.parse(contract);
        } catch {
          status.textContent =
            "Invalid function contract JSON. No mission submitted.";
          return;
        }
      }
      const response = await fetch("/control/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: JSON.stringify({
          kind: fields.get("kind"),
          prompt: fields.get("prompt"),
          useLocalDocs: fields.has("useLocalDocs"),
          ...(contract ? { functionContract } : {}),
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
