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
    <label>API key <input name="apiKey" type="password" autocomplete="off" placeholder="Leave blank for local Ollama"></label>
    <p class="muted">Local Ollama needs no API key. Remote providers may require one. This form alone does not sign in to Codex; the local Codex adapter uses your CLI login. Saved only in a private local configuration file. A blank key keeps the saved key only for the same endpoint.</p>
    <button type="submit">Save connection</button></form></details>
    <p id="continuation-status" role="status">New mission</p><button id="clear-continuation" type="button" hidden>Cancel follow-up</button>
    <form id="mission-form"><label>Task type <select name="kind"><option value="writing">Writing + review</option><option value="code">JavaScript + review</option><option value="kujo">Kujo + senior review (real MCP)</option></select></label>
    <label><input type="checkbox" name="allowCheckins" checked> Allow agent questions (reply within 3 minutes)</label>
    <label><input type="checkbox" name="useLocalDocs"> Use indexed local Kujo docs</label>
    <label><input type="checkbox" name="useMcpDocs"> Read local MCP demo README</label>
    <label>Task <textarea name="prompt" rows="3" maxlength="16384" required placeholder="Describe the small task you want the agents to complete."></textarea></label>
    <details><summary>Optional JavaScript function checks</summary><label>Function contract JSON <textarea name="functionContract" rows="4" placeholder='{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0}]}'></textarea></label><p class="muted">Explicitly runs the generated module in a disposable browser worker. JSON arguments/results only; no filesystem or network integrations. Requires installed Chromium. Each case gets 1.5 seconds.</p></details>
    <button type="submit" disabled>Start mission</button></form>
    <p class="muted">Sends your task to the configured model. The SDK hands the draft to a reviewer. Code runs only when explicit function cases are supplied, in an isolated browser without host integrations.</p>
    <div id="mission-jobs" aria-label="Mission history"></div><pre id="mission-exchanges" tabindex="0" aria-label="Observed agent responses"></pre><pre id="mission-artifact" tabindex="0" aria-label="Selected mission output"></pre>`;
  host.querySelector(".world")!.after(panel);
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
                : `${entry.agent} · actual model response`;
            const identity = document.createElement("small");
            identity.textContent = `${entry.producer}:${entry.run}:${entry.agent}`;
            const text = document.createElement("pre");
            let content = entry.content;
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed.cityQuestion === "string")
                content = parsed.cityQuestion;
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
  const submit = form.querySelector("button")!;
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
        configLoaded = true;
      }
      const key = JSON.stringify(data.jobs);
      if (key !== historyKey) {
        historyKey = key;
        history.replaceChildren();
        for (const job of data.jobs) {
          const button = document.createElement("button");
          button.textContent = `${job.kind} / ${job.status} / ${job.id.slice(-8)}${job.parentMissionId ? " · follows " + job.parentMissionId.slice(-8) : ""}`;

          button.onclick = async () => {
            if (!replay) {
              selectedMission = job.id;
              conversationKey = "";
              void refreshConversation();
              onMission(job.id);
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
                  : artifact.kind === "kujo"
                    ? `KUJO STATIC CHECK: ${artifact.validation?.syntax?.toUpperCase() || "UNKNOWN"} · CODE NOT EXECUTED\nSENIOR REVIEW · MODEL OPINION, NOT A TEST RESULT\n\n`
                    : "MODEL-REVIEWED TEXT · FACTUAL ACCURACY AND TASK CONSTRAINTS NOT VERIFIED\n\n") +
                (artifact.draft
                  ? "KUJO AUTHOR DRAFT\n" +
                    artifact.draft +
                    "\n\nSENIOR REVIEW\n"
                  : "") +
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
          allowCheckins: fields.has("allowCheckins"),
          useLocalDocs: fields.has("useLocalDocs"),
          useMcpDocs: fields.has("useMcpDocs"),
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
      modelForm.querySelector("button")!.disabled = value;
      void refresh();
    },
  };
}
