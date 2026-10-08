import { mountAgentCatalog } from "./agent-catalog";
export function mountMissions(
  host: HTMLElement,
  onMission: (id: string) => void = () => {},
) {
  const panel = document.createElement("section");
  panel.className = "mission-panel";
  panel.innerHTML = `<h2>MISSION COMMAND</h2><p id="mission-status" role="status">Checking model connection…</p>
    <details><summary>Model connection</summary><form id="model-form">
    <label>Chat completions endpoint <input name="endpoint" type="url" required placeholder="Full HTTPS or local HTTP endpoint"></label>
    <label>Model <input name="model" required autocomplete="off"></label>
    <label>Output token limit <input name="maxOutputTokens" type="number" min="256" max="16384" step="1" value="2048" required></label><p class="muted">Higher limits may use more time and provider credits. If a failed attempt reports finish reason length, choose a higher limit explicitly before retrying.</p>
    <label>API key <input name="apiKey" type="password" autocomplete="off" placeholder="Leave blank for local Ollama"></label>
    <p class="muted">Local Ollama needs no API key. Remote providers may require one. This form alone does not sign in to Codex; the local Codex adapter uses your CLI login. Saved only in a private local configuration file. A blank key keeps the saved key only for the same endpoint.</p>
    <button type="submit">Save connection</button>
    <button type="button" id="detect-ollama">Detect local Ollama</button>
    <label id="local-model-label" hidden>Available Ollama models <select id="local-models"><option value="">Choose a model</option></select></label>
    <button type="button" id="check-model">Check model listing</button>
    <p id="model-check-status" role="status" aria-live="polite"></p>
    <p class="muted">Codex subscription: sign in with <code>codex login</code>, then run <code id="codex-setup-command"></code> from the managed Agent City directory in another terminal. For a source checkout, use <code>npm run provider:codex</code> with the same CITY_APP_URL instead. Keep it running. The adapter configures the connection; do not paste your subscription password or OAuth token here.</p>
    </form></details>
    <p id="continuation-status" role="status">New mission</p><button id="clear-continuation" type="button" hidden>Cancel follow-up</button>
    <form id="mission-form"><label>Task type <select name="kind"><option value="writing">Writing + review</option><option value="code">JavaScript + review</option><option value="kujo">Kujo + senior review (real MCP)</option></select></label>
    <details><summary>Custom author / reviewer</summary><p>Optional imported profiles. PROPOSE drafts with optional documentation context when the author allows Kujo Docs. Explicit code test cases run separately in the isolated checker. Other tool/workflow execution is not connected. Leave both fields blank for built-in agents. Continuations retain their original contracts.</p><label>Author profile <select name="authorProfile"><option value="">Built-in author</option></select></label><label>Reviewer profile <select name="reviewerProfile"><option value="">Built-in reviewer</option></select></label><button type="button" id="refresh-team-options">Refresh imported profiles</button><p id="team-options-status" role="status"></p></details>
    <label><input type="checkbox" name="allowCheckins" checked> Allow agent questions (reply within 3 minutes)</label>
    <label><input type="checkbox" name="useLocalDocs"> Use indexed local Kujo docs</label>
    <label><input type="checkbox" name="useMcpDocs"> Read local MCP demo README</label>
    <label>Task <textarea name="prompt" rows="3" maxlength="16384" required placeholder="Describe the small task you want the agents to complete."></textarea></label>
    <label><input type="checkbox" name="executeWorkcell"> Execute checked Kujo code in Workcell after review (requires operator setup; no network or project access)</label>
    <details><summary>Workcell execution setup</summary><p>Requires a running local Docker/Podman engine and a trusted local image containing Kujo. For Docker in a managed installation, run <code>../start.command setup:workcell --build</code> from the Agent City directory (source checkout: <code>npm run setup:workcell -- --build</code>) to build the supplied local image, then use its printed launch command. The operator sets <code>CITY_ENABLE_WORKCELL=1</code> and <code>CITY_WORKCELL_IMAGE</code> before starting Agent City. Select the intended engine context in the launcher environment.</p><button type="button" id="check-workcell">Check Workcell setup</button><p id="workcell-check-status" role="status" aria-live="polite">Not checked. This check does not install software, pull images, run code or enable execution.</p></details>
    <details><summary>Optional JavaScript function checks</summary><label>Function contract JSON <textarea name="functionContract" rows="4" placeholder='{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0}]}'></textarea></label><p class="muted">Explicitly runs the generated module in a disposable browser worker. JSON arguments/results only; no filesystem or network integrations. Requires installed Chromium. Each case gets 1.5 seconds.</p></details>
    <button type="submit" disabled>Start mission</button></form>
    <p class="muted">Sends your task to the configured model. The SDK hands the draft to a reviewer. JavaScript runs only with explicit function cases in an isolated browser. Kujo runs only with the separate Workcell opt-in and operator setup.</p>
    <div id="mission-jobs" aria-label="Mission history"></div><pre id="mission-exchanges" tabindex="0" aria-label="Observed agent responses"></pre><pre id="provider-diagnostics" tabindex="0" aria-label="Provider response diagnostics" hidden></pre><pre id="mission-artifact" tabindex="0" aria-label="Selected mission output"></pre>`;
  panel.querySelector("#codex-setup-command")!.textContent =
    `CITY_APP_URL=${window.location.origin} ../start.command provider:codex`;
  host.querySelector(".world")!.after(panel);
  mountAgentCatalog(panel);
  const chat = document.createElement("section");
  chat.className = "game-conversation";
  chat.setAttribute("aria-label", "Mission conversation");
  chat.innerHTML = `<h2>MISSION CONVERSATION</h2><p id="conversation-state" role="status">Start or select a mission to see actual model responses.</p><div id="speech-bubbles" role="log" aria-label="Recorded conversation"></div><form id="reply-form" hidden><label>Your reply <textarea name="answer" rows="2" maxlength="8192" required></textarea></label><button>Reply / continue</button></form>`;
  host.querySelector(".world")!.append(chat);
  const bubbles = chat.querySelector<HTMLElement>("#speech-bubbles")!;
  const chatStatus = chat.querySelector<HTMLElement>("#conversation-state")!;
  const replyForm = chat.querySelector<HTMLFormElement>("#reply-form")!;
  let selectedJobStatus = "unknown";
  let selectedMission: string | null = null,
    checkpointId: string | null = null,
    conversationKey = "",
    chatBusy = false;
  async function refreshConversation() {
    if (!selectedMission || replay || chatBusy) return;
    const id = selectedMission;
    chatBusy = true;
    try {
      const response = await fetch(
        "/control/exchanges/" + encodeURIComponent(id),
      );
      if (!response.ok) throw Error();
      const data = await response.json();
      if (replay || id !== selectedMission) return;
      const key = JSON.stringify(data.records);
      if (key !== conversationKey) {
        conversationKey = key;
        bubbles.replaceChildren(
          ...data.records.map((entry: any) => {
            const bubble = document.createElement("article");
            bubble.className =
              "speech-bubble" +
              (entry.kind === "user.reply" ? " user-bubble" : "");
            const label = document.createElement("strong");
            label.textContent =
              entry.kind === "user.reply"
                ? "YOU · recorded reply"
                : `${(entry.agent === "reviewer" ? data.profiles?.reviewer?.name : ["writer", "coder"].includes(entry.agent) ? data.profiles?.author?.name : null) || entry.agent} · actual model response`;
            const identity = document.createElement("small");
            identity.textContent = `${entry.producer}:${entry.run}:${entry.agent}`;
            const text = document.createElement("pre");
            let content = entry.content;
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed.cityQuestion === "string")
                content = parsed.cityQuestion;
              else if (
                data.profiles &&
                entry.agent === "reviewer" &&
                typeof parsed.cityArtifact === "string" &&
                typeof parsed.cityReview === "string"
              )
                content =
                  "REVIEWER COMMENTARY · model assessment\n" +
                  parsed.cityReview +
                  "\n\nDELIVERABLE\n" +
                  parsed.cityArtifact;
            } catch {}
            text.textContent = content;
            bubble.append(label, identity, text);
            return bubble;
          }),
        );
        bubbles.scrollTop = bubbles.scrollHeight;
      }
      checkpointId = data.checkpoint?.id ?? null;
      replyForm.hidden = !checkpointId;
      chatStatus.textContent = data.checkpoint
        ? `WAITING FOR YOU · ${data.checkpoint.agent} · reply by ${new Date(data.checkpoint.deadline).toLocaleTimeString()}`
        : `Mission ${id.slice(-8)} · ${selectedJobStatus.toUpperCase()} · ${data.recordingComplete ? "Recorded responses" : "Partial / unknown response coverage"} · no question pending`;
    } catch {
      checkpointId = null;
      replyForm.hidden = true;
      chatStatus.textContent =
        "Conversation unavailable. No dialogue inferred.";
    } finally {
      chatBusy = false;
    }
  }
  replyForm.onsubmit = async (event) => {
    event.preventDefault();
    if (replay || !selectedMission || !checkpointId) return;
    const button = replyForm.querySelector("button")!;
    button.disabled = true;
    try {
      const response = await fetch("/control/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: JSON.stringify({
          missionId: selectedMission,
          checkpointId,
          answer: new FormData(replyForm).get("answer"),
        }),
      });
      if (!response.ok) throw Error((await response.json()).error);
      replyForm.reset();
      replyForm.hidden = true;
      checkpointId = null;
      chatStatus.textContent =
        "Reply accepted. Waiting for the agent's next actual response.";
    } catch (error) {
      chatStatus.textContent = String(error);
    } finally {
      button.disabled = false;
    }
  };
  const form = panel.querySelector<HTMLFormElement>("#mission-form")!;
  const modelForm = panel.querySelector<HTMLFormElement>("#model-form")!;
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const status = panel.querySelector<HTMLElement>("#mission-status")!;
  const output = panel.querySelector<HTMLElement>("#mission-artifact")!;
  const history = panel.querySelector<HTMLElement>("#mission-jobs")!;
  let token = "",
    pending = false,
    historyKey = "",
    replay = false,
    configLoaded = false;
  let parent: { id: string; kind: string } | null = null;
  const continuation = panel.querySelector<HTMLElement>(
    "#continuation-status",
  )!;
  const clearContinuation = panel.querySelector<HTMLButtonElement>(
    "#clear-continuation",
  )!;
  const kindField = form.elements.namedItem("kind") as HTMLSelectElement;
  function clearParent() {
    parent = null;
    (form.elements.namedItem("executeWorkcell") as HTMLInputElement).checked =
      false;
    kindField.disabled = false;
    clearContinuation.hidden = true;
    continuation.textContent = "New mission";
    form.reset();
  }
  clearContinuation.onclick = clearParent;
  async function refresh() {
    try {
      const response = await fetch("/control/status");
      if (!response.ok) throw Error();
      const data = await response.json();
      token = data.token;
      if (!selectedMission && !replay) {
        const running = data.jobs.find((j: any) => j.status === "running");
        if (running) {
          selectedMission = running.id;
          onMission(running.id);
          void refreshConversation();
        }
      }
      selectedJobStatus =
        data.jobs.find((j: any) => j.id === selectedMission)?.status ??
        "unknown";
      if (!pending)
        status.textContent = data.configured
          ? `MODEL / ${data.model}${data.jobs.some((j: any) => j.status === "unknown") ? " · Recovery pending / UNKNOWN" : data.busy ? " · Mission service busy" : " · Configured"}`
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
        (
          modelForm.elements.namedItem("maxOutputTokens") as HTMLInputElement
        ).value = String(data.maxOutputTokens ?? 2048);
        configLoaded = true;
      }
      const key = JSON.stringify(data.jobs);
      if (key !== historyKey) {
        historyKey = key;
        history.replaceChildren();
        for (const job of data.jobs) {
          const button = document.createElement("button");
          button.textContent = `${job.profiles ? job.profiles.author.name + " → " + job.profiles.reviewer.name + " / " : ""}${job.kind} / ${job.status} / ${job.id.slice(-8)}${job.parentMissionId ? " · follows " + job.parentMissionId.slice(-8) : ""}`;

          button.onclick = async () => {
            if (!replay) {
              selectedMission = job.id;
              conversationKey = "";
              void refreshConversation();
              onMission(job.id);
            }
            const diagnosticPanel = panel.querySelector<HTMLElement>(
              "#provider-diagnostics",
            )!;
            diagnosticPanel.hidden = job.status !== "failed";
            if (job.status === "failed") {
              diagnosticPanel.textContent = "Reading provider diagnostics…";
              void fetch("/control/diagnostics/" + encodeURIComponent(job.id))
                .then(async (response) => {
                  if (!response.ok) throw Error();
                  const diagnostics = await response.json();
                  if (selectedMission !== job.id) return;
                  diagnosticPanel.textContent =
                    "PROVIDER DIAGNOSTICS / " +
                    (diagnostics.complete
                      ? "recorded"
                      : "partial or unavailable") +
                    "\n" +
                    diagnostics.message +
                    "\n" +
                    diagnostics.records
                      .map(
                        (record: any) =>
                          `${record.agent}: HTTP ${record.httpStatus || "UNKNOWN"}; finish ${record.finishReason}; ${record.contentCharacters} content characters; requested token limit ${record.requestedMaxTokens}; reasoning_content present ${record.reasoningPresent ? "yes" : "no"}`,
                      )
                      .join("\n");
                })
                .catch(() => {
                  if (selectedMission === job.id)
                    diagnosticPanel.textContent =
                      "Provider diagnostics unavailable; failure cause UNKNOWN.";
                });
            }
            try {
              let requestText = "USER REQUEST UNAVAILABLE";
              if (["completed", "failed"].includes(job.status)) {
                const request = await fetch(
                  "/control/mission/" + encodeURIComponent(job.id),
                );
                if (request.ok)
                  requestText =
                    "USER REQUEST\n" + (await request.json()).prompt;
              }
              const response = await fetch(
                "/control/exchanges/" + encodeURIComponent(job.id),
              );
              if (!response.ok) throw Error();
              const exchanges = await response.json();
              panel.querySelector("#mission-exchanges")!.textContent =
                requestText +
                "\n\n" +
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
            let workcellEvidence = null;
            try {
              const response = await fetch(
                "/control/workcell/" + encodeURIComponent(job.id),
              );
              if (response.ok)
                workcellEvidence = (await response.json()).workcell;
            } catch {
              /* The overall mission state remains independently authoritative. */
            }
            if (job.status !== "completed") {
              output.textContent =
                `Mission ${job.status}; no completed mission artifact claimed.` +
                (workcellEvidence
                  ? "\n\nWORKCELL EVIDENCE (independent of mission status)\n" +
                    JSON.stringify(workcellEvidence, null, 2)
                  : "");
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
                  : artifact.kind === "kujo"
                    ? `KUJO STATIC CHECK: ${artifact.validation?.syntax?.toUpperCase() || "UNKNOWN"} · ${artifact.validation?.checkedArtifact === "reviewed.kujo" ? "REVIEWED CODE" : "AUTHOR DRAFT"} · ${artifact.codeExecuted === true ? "EXECUTED IN WORKCELL" : artifact.codeExecuted === null ? "EXECUTION UNKNOWN" : "CODE NOT EXECUTED"}\nREVIEW COMMENTARY IS MODEL OPINION, NOT A TEST RESULT\n\n`
                    : "MODEL-REVIEWED TEXT · FACTUAL ACCURACY AND TASK CONSTRAINTS NOT VERIFIED\n\n") +
                (artifact.draft
                  ? "KUJO AUTHOR DRAFT\n" +
                    artifact.draft +
                    (artifact.validation?.checkedArtifact === "reviewed.kujo"
                      ? "\n\nREVIEWED KUJO CODE\n"
                      : "\n\nSENIOR REVIEW\n")
                  : "") +
                artifact.content +
                (artifact.workcell
                  ? "\n\nWORKCELL EVIDENCE\n" +
                    JSON.stringify(artifact.workcell, null, 2)
                  : "") +
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
          if (["completed", "failed"].includes(job.status)) {
            const followup = document.createElement("button");
            followup.dataset.continue = job.id;
            followup.textContent = `Continue / repair ${job.id.slice(-8)}`;
            followup.onclick = async () => {
              if (replay || pending) return;
              pending = true;
              submit.disabled = true;
              try {
                const response = await fetch(
                  "/control/mission/" + encodeURIComponent(job.id),
                );
                const details = await response.json();
                if (!response.ok)
                  throw Error(details.error || "Recorded context unavailable");
                if (replay) return;
                clearParent();
                parent = { id: job.id, kind: job.kind };
                kindField.value = job.kind;
                kindField.disabled = true;
                clearContinuation.hidden = false;
                continuation.textContent = `Follow-up to ${job.id}. Prior task, output and check results will be included. This starts a new execution and retains the old attempt.`;
                if (details.functionContract) {
                  const field = form.elements.namedItem(
                    "functionContract",
                  ) as HTMLTextAreaElement;
                  field.value = JSON.stringify(
                    details.functionContract,
                    null,
                    2,
                  );
                  field.closest("details")!.open = true;
                }
                (
                  form.elements.namedItem("prompt") as HTMLTextAreaElement
                ).focus();
              } catch (error) {
                status.textContent =
                  error instanceof Error
                    ? error.message
                    : "Recorded context unavailable";
              } finally {
                pending = false;
              }
            };
            history.append(followup);
          }
        }
      }
      history
        .querySelectorAll<HTMLButtonElement>("[data-continue]")
        .forEach((button) => {
          button.disabled = replay || pending || data.busy;
        });
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
          kind: parent?.kind || fields.get("kind"),
          prompt: fields.get("prompt"),
          ...(fields.get("authorProfile") || fields.get("reviewerProfile")
            ? {
                profiles: {
                  authorId: fields.get("authorProfile"),
                  reviewerId: fields.get("reviewerProfile"),
                },
              }
            : {}),
          allowCheckins: fields.has("allowCheckins"),
          useLocalDocs: fields.has("useLocalDocs"),
          useMcpDocs: fields.has("useMcpDocs"),
          executeWorkcell: fields.has("executeWorkcell"),
          ...(contract ? { functionContract } : {}),
          ...(parent ? { parentMissionId: parent.id } : {}),
        }),
      });
      const result = await response.json();
      status.textContent = response.ok
        ? `Mission accepted: ${result.id}`
        : result.error;
      if (response.ok) {
        selectedMission = result.id;
        conversationKey = "";
        onMission(result.id);
        clearParent();
        void refreshConversation();
        host
          .querySelector(".world")!
          .scrollIntoView({ block: "start", behavior: "instant" });
      }
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
          maxOutputTokens: Number(fields.get("maxOutputTokens")),
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
  const teamStatus = panel.querySelector<HTMLElement>("#team-options-status")!;
  panel.querySelector<HTMLButtonElement>("#refresh-team-options")!.onclick =
    async () => {
      try {
        const response = await fetch("/control/agents");
        if (!response.ok) throw Error();
        const data = await response.json();
        for (const [field, label] of [
          ["authorProfile", "Built-in author"],
          ["reviewerProfile", "Built-in reviewer"],
        ]) {
          const select = form.elements.namedItem(field) as HTMLSelectElement;
          const previous = select.value;
          select.replaceChildren(new Option(label, ""));
          for (const profile of data.profiles) {
            const option = new Option(
              `${profile.name} / ${profile.team} / ${profile.executionStatus}`,
              profile.id,
            );
            option.disabled = profile.executionStatus !== "DRAFT_REVIEW_ONLY";
            select.add(option);
          }
          if (
            [...Array.from(select.options)].some(
              (option) => option.value === previous,
            )
          )
            select.value = previous;
        }
        teamStatus.textContent = data.imported
          ? "Choose author and reviewer profiles. Separate execution instances are created, even if the profile is shared. Unavailable capability contracts cannot be selected."
          : "Import a Kujo agent catalog first.";
      } catch {
        teamStatus.textContent =
          "Catalog unavailable; no profiles selected automatically.";
      }
    };
  const modelCheck = panel.querySelector<HTMLElement>("#model-check-status")!;
  const workcellCheck = panel.querySelector<HTMLElement>(
    "#workcell-check-status",
  )!;
  const workcellButton =
    panel.querySelector<HTMLButtonElement>("#check-workcell")!;
  workcellButton.onclick = async () => {
    if (replay || pending || !token) return;
    pending = true;
    workcellButton.disabled = true;
    workcellCheck.textContent = "Checking local Workcell setup…";
    try {
      const response = await fetch("/control/check-workcell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: "{}",
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Workcell setup check failed");
      workcellCheck.textContent = `CHECK RESULT · ${result.available ? "AVAILABLE" : "SETUP REQUIRED"} · ${result.message}`;
    } catch (error) {
      workcellCheck.textContent =
        error instanceof Error ? error.message : "Workcell setup check failed";
    } finally {
      pending = false;
      workcellButton.disabled = replay;
    }
  };
  const localModels = panel.querySelector<HTMLSelectElement>("#local-models")!;
  localModels.onchange = () => {
    if (replay || !localModels.value) return;
    (modelForm.elements.namedItem("endpoint") as HTMLInputElement).value =
      "http://127.0.0.1:11434/v1/chat/completions";
    (modelForm.elements.namedItem("model") as HTMLInputElement).value =
      localModels.value;
    (modelForm.elements.namedItem("apiKey") as HTMLInputElement).value = "";
    modelCheck.textContent =
      "Ollama model selected. Save connection to use it; no model was run.";
  };
  for (const [id, route] of [
    ["detect-ollama", "/control/discover-ollama"],
    ["check-model", "/control/check-model"],
  ]) {
    panel.querySelector<HTMLButtonElement>(`#${id}`)!.onclick = async () => {
      if (replay || pending || !token) return;
      pending = true;
      modelCheck.textContent = "Checking provider metadata…";
      const fields = new FormData(modelForm);
      try {
        const response = await fetch(route, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-City-Command-Token": token,
          },
          body: JSON.stringify(
            id === "detect-ollama"
              ? {}
              : {
                  endpoint: fields.get("endpoint"),
                  model: fields.get("model"),
                  apiKey: fields.get("apiKey"),
                  maxOutputTokens: Number(fields.get("maxOutputTokens")),
                },
          ),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Provider check failed");
        if (id === "detect-ollama") {
          localModels.replaceChildren(new Option("Choose a model", ""));
          for (const name of result.models || [])
            localModels.add(new Option(name, name));
          panel.querySelector<HTMLElement>("#local-model-label")!.hidden =
            !result.available || !result.models.length;
          modelCheck.textContent = result.available
            ? result.models.length
              ? "Ollama detected. Choose a model, then save. No API key is required for this local connection. Execution may be local or cloud depending on the model."
              : "Ollama is running but has no installed models. Install a model in Ollama, then detect again."
            : result.message;
        } else modelCheck.textContent = result.message;
      } catch (error) {
        modelCheck.textContent =
          error instanceof Error ? error.message : "Provider check failed";
      } finally {
        pending = false;
      }
    };
  }
  void refresh();
  setInterval(() => {
    if (!document.hidden && !pending) {
      void refresh();
      void refreshConversation();
    }
  }, 3000);
  return {
    setReplay(value: boolean) {
      replay = value;
      replyForm.hidden = true;
      if (value) {
        bubbles.replaceChildren();
        conversationKey = "";
        chatStatus.textContent =
          "REPLAY · normalized metadata only; live conversation hidden and replies disabled.";
      } else void refreshConversation();
      submit.disabled = true;
      modelForm.querySelectorAll("button").forEach((button) => {
        button.disabled = value;
      });
      localModels.disabled = value;
      workcellButton.disabled = value;
      void refresh();
    },
  };
}
