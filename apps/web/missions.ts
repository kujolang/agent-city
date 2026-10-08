import {
  artifactDownload,
  functionalSummary,
  projectBundleDownload,
} from "./mission-artifact";
import { mountAgentCatalog } from "./agent-catalog";
export function mountMissions(
  host: HTMLElement,
  onMission: (id: string, reason?: "restore") => void = () => {},
) {
  const panel = document.createElement("section");
  panel.className = "mission-panel";
  panel.innerHTML = `<h2>MISSION COMMAND</h2><p id="mission-status" role="status">Checking model connection…</p>
    <details id="model-settings"><summary>Model connection</summary><form id="model-form">
    <details id="provider-setup"><summary>First-time provider setup</summary>
    <p>Choose one provider. Agent City includes the agent runtime, but no model account or sign-in.</p>
    <h3>Ollama</h3><ol><li><a href="https://docs.ollama.com/quickstart" target="_blank" rel="noopener noreferrer">Install and open Ollama</a>. Choose a local model, or sign in to Ollama for a cloud model.</li><li>Choose <strong>Detect local Ollama</strong> below, select a model, then <strong>Check model listing</strong> and <strong>Save connection</strong>.</li></ol><p>The API key stays blank for the local Ollama connection. Cloud model sign-in happens in Ollama, not in this key field. A listed model is not yet a successful task.</p>
    <h3>Codex CLI</h3><ol><li><a href="https://learn.chatgpt.com/docs/codex/cli" target="_blank" rel="noopener noreferrer">Install Codex CLI</a>, then run <code>codex login</code> and complete its browser sign-in. Check it with <code>codex login status</code>.</li><li>Run the Agent City Codex command shown below in another terminal and keep it open. It configures the connection automatically; wait for the MODEL status to update.</li></ol><p>Account access and usage limits belong to your provider. Never paste a subscription password or sign-in token into Agent City. <a href="https://learn.chatgpt.com/docs/auth" target="_blank" rel="noopener noreferrer">Codex authentication help</a>.</p>
    <h3>First task</h3><p>Choose <strong>Writing + review</strong>, describe a short task using facts you supply, then <strong>Start mission</strong>. Watch the author and reviewer with Follow. Read the saved output and review in mission history; model review is advice, not an independent correctness check.</p>
    </details>
    <label>Chat completions endpoint <input name="endpoint" type="url" required placeholder="Full HTTPS or local HTTP endpoint"></label>
    <label>Model <input name="model" required autocomplete="off"></label>
    <label>Provider timeout (seconds) <input name="requestTimeoutSeconds" type="number" min="10" max="300" step="1" value="90" required></label><p class="muted">Maximum wait for each model response. Increase explicitly for slower models; a timeout never means the provider completed the work.</p>
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
    <form id="mission-form">
    <label>Workflow <select name="workflow"><option value="">General draft + review</option><option value="webops-report">WebOps supplied-evidence report</option></select></label>
    <div id="webops-input" hidden><p>WebOps Reporter → Copy Chief → report contract check. Paste your actual site evidence below. This workflow does not crawl your website, access analytics or publish changes. Evidence is sent to your configured model and retained privately with this mission.</p><label>Site evidence JSON <textarea name="workflowInput" rows="8" maxlength="16384" placeholder='{"schema":"agent-city.webops-evidence.v1","site":{"id":"your-site","url":"https://example.com"},"records":[{"id":"finding-1","source":"your-audit-reference","observedAt":"2026-10-08T00:00:00Z","kind":"finding","summary":"Replace with an actual observed finding"}],"unavailable":["analytics","crawl","historical comparison"]}'></textarea></label><p>Each record needs a unique ID, source reference, occurrence timestamp, kind (finding, action or measurement), and summary. List evidence families you do not have. The check validates structure and references; it cannot independently establish whether your supplied facts are true.</p></div>
    <label>Task type <select name="kind"><option value="writing">Writing + review</option><option value="code">JavaScript + review</option><option value="kujo">Kujo + senior review (real MCP)</option></select></label>
    <fieldset id="profile-options"><details><summary>Custom author / reviewer</summary><p>Optional imported profiles. PROPOSE drafts with optional documentation context when the author allows Kujo Docs. Explicit code test cases run separately in the isolated checker. Other tool/workflow execution is not connected. Leave both fields blank for built-in agents. Continuations retain their original contracts.</p><label>Author profile <select name="authorProfile"><option value="">Built-in author</option></select></label><label>Reviewer profile <select name="reviewerProfile"><option value="">Built-in reviewer</option></select></label><button type="button" id="refresh-team-options">Refresh imported profiles</button><p id="team-options-status" role="status"></p></details></fieldset>
    <label>Task <textarea name="prompt" rows="3" maxlength="16384" required placeholder="Describe the small task you want the agents to complete."></textarea></label>
    <label><input type="checkbox" name="allowCheckins" checked> Allow agent questions (reply within 3 minutes)</label>
    <fieldset id="tool-options"><details id="mission-options"><summary>Tools, files and checks <span id="mission-options-count">(none selected)</span></summary>
    <label><input type="checkbox" name="useLocalDocs"> Use indexed local Kujo docs</label>
    <label><input type="checkbox" name="useMcpDocs"> Read local MCP demo README</label>
    <details><summary>Approved MCP source reads</summary><label>Local server file names (one per line)<textarea name="mcpReadFiles" rows="3" maxlength="482" placeholder="src/main.kujo"></textarea></label><p>Read the first 200 lines of up to three named files using the operator-enabled local MCP server. Server workspace restrictions still apply. Contents are shared privately with the author and reviewer. This grants no writes or model-selected tools.</p></details>
    <details><summary>Selected project files</summary><label>Text files <input type="file" name="projectFiles" multiple></label><p>Up to eight UTF-8 text files,16 KiB each and32 KiB total. Selected content is sent to your configured model for the author and reviewer, and retained privately with this mission. This does not grant host project access or editing. Follow-ups retain the prior snapshot unless new files are selected; start a new mission for a separate context.</p></details>
    <label><input type="checkbox" name="executeWorkcell"> Execute checked Kujo code in Workcell after review (requires operator setup; no network or host project access)</label>
    <label><input type="checkbox" name="includeProjectFiles"> Copy selected project files into this Workcell run</label><p>Separate per-task permission. Files are copied under <code>project/</code> in the disposable workspace; generated code can read, import or change these copies. Host files are not mounted or modified. Only explicitly named output files are exported. Re-enable this permission for each follow-up.</p>
    <details><summary>Project files to export</summary><label>Relative output file names (one per line)<textarea name="exportProjectFiles" rows="3" maxlength="1288" placeholder="src/main.kujo"></textarea></label><p>Requires Workcell execution. Only these files under <code>project/</code> are returned: at most eight UTF-8 text files,16 KiB each and32 KiB total. Inspect/download the output bundle; host files are never overwritten. Exporting a file does not mean it passed review or tests.</p></details>
    <details><summary>Optional Kujo output check</summary><label><input type="checkbox" name="checkOutput"> Check exact stdout after Workcell execution</label><label>Expected stdout <textarea name="expectedOutput" rows="3" maxlength="16384"></textarea></label><p>Requires the Workcell execution opt-in. Include the final newline if your program prints one. CRLF is normalized; all other whitespace is significant. A completed task can still fail this check.</p></details>
    <details><summary>Workcell execution setup</summary><p>Start your local Docker engine, then run this command from the Agent City directory:</p><code id="workcell-setup-command">npm run setup:workcell -- --build --enable</code><p>This builds the pinned Kujo image and saves its ID and selected Docker context for this City instance. Restart City normally, then check setup below. Each task still needs the execution checkbox. To disable saved setup, use <code>setup:workcell --disable</code> and restart. Existing trusted images can use <code>--image LOCAL_IMAGE --enable</code>. The command does not install or start Docker. Podman remains manually configured.</p><button type="button" id="check-workcell">Check Workcell setup</button><p id="workcell-check-status" role="status" aria-live="polite">Not checked. This check does not install software, pull images, run code or enable execution.</p></details>
    <details><summary>Optional JavaScript function checks</summary><label>Function contract JSON <textarea name="functionContract" rows="4" placeholder='{"exportName":"sum","cases":[{"name":"empty","args":[[]],"equals":0}]}'></textarea></label><p class="muted">Explicitly runs the generated module in a disposable browser worker. JSON arguments/results only; no filesystem or network integrations. Requires installed Chromium. Each case gets 1.5 seconds.</p></details>
    </details>
    </fieldset><button type="submit" disabled>Start mission</button></form>
    <p class="muted">Your configured model drafts the task and hands it to a separate reviewer. Execution needs the explicit checks or Workcell permissions above.</p>
    <div id="mission-jobs" aria-label="Mission history"></div><pre id="mission-exchanges" tabindex="0" aria-label="Observed agent responses"></pre><pre id="provider-diagnostics" tabindex="0" aria-label="Provider response diagnostics" hidden></pre><button type="button" id="download-project-files" hidden>Save project file bundle</button><button type="button" id="download-artifact" hidden>Save artifact</button><pre id="mission-artifact" tabindex="0" aria-label="Selected mission output"></pre>`;
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
  const options = panel.querySelector<HTMLDetailsElement>("#mission-options")!;
  const optionsCount = panel.querySelector<HTMLElement>(
    "#mission-options-count",
  )!;
  function refreshOptions() {
    const enabled = options.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]:checked',
    ).length;
    const supplied = Array.from(
      options.querySelectorAll<HTMLTextAreaElement>("textarea"),
    ).filter(
      (field) => field.name !== "expectedOutput" && field.value.trim(),
    ).length;
    const files = (form.elements.namedItem("projectFiles") as HTMLInputElement)
      .files?.length
      ? 1
      : 0;
    const count = enabled + supplied + files;
    optionsCount.textContent = count
      ? `(${count} selected)`
      : "(none selected)";
  }
  form.addEventListener("input", refreshOptions);
  form.addEventListener("change", refreshOptions);
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const status = panel.querySelector<HTMLElement>("#mission-status")!;
  const output = panel.querySelector<HTMLElement>("#mission-artifact")!;
  const download =
    panel.querySelector<HTMLButtonElement>("#download-artifact")!;
  const projectDownload = panel.querySelector<HTMLButtonElement>(
    "#download-project-files",
  )!;
  function saveDownload(saved: {
    content: string;
    mime: string;
    filename: string;
  }) {
    const url = URL.createObjectURL(
      new Blob([saved.content], { type: saved.mime }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = saved.filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  let artifactSelection = 0;
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
  const workflowField = form.elements.namedItem(
    "workflow",
  ) as HTMLSelectElement;
  function refreshWorkflow() {
    const webops = workflowField.value === "webops-report";
    panel.querySelector<HTMLElement>("#webops-input")!.hidden = !webops;
    const evidence = form.elements.namedItem(
      "workflowInput",
    ) as HTMLTextAreaElement;
    evidence.disabled = !webops;
    evidence.required = webops;
    panel.querySelector<HTMLFieldSetElement>("#profile-options")!.disabled =
      webops;
    panel.querySelector<HTMLFieldSetElement>("#tool-options")!.disabled =
      webops;
    if (webops) kindField.value = "writing";
    kindField.disabled = webops || !!parent;
    workflowField.disabled = !!parent;
  }
  workflowField.onchange = refreshWorkflow;
  refreshWorkflow();
  function clearParent() {
    parent = null;
    (form.elements.namedItem("executeWorkcell") as HTMLInputElement).checked =
      false;
    kindField.disabled = false;
    clearContinuation.hidden = true;
    continuation.textContent = "New mission";
    form.reset();
    refreshWorkflow();
    options.open = false;
    refreshOptions();
  }
  clearContinuation.onclick = clearParent;
  async function refresh() {
    try {
      const response = await fetch("/control/status");
      if (!response.ok) throw Error();
      const data = await response.json();
      token = data.token;
      if (typeof data.workcellSetupCommand === "string")
        panel.querySelector("#workcell-setup-command")!.textContent =
          data.workcellSetupCommand;
      if (!selectedMission && !replay) {
        const running = data.jobs.find((j: any) => j.status === "running");
        if (running) {
          selectedMission = running.id;
          onMission(running.id, "restore");
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
        panel.querySelector<HTMLDetailsElement>("#provider-setup")!.open =
          !data.configured;
        (modelForm.elements.namedItem("endpoint") as HTMLInputElement).value =
          data.endpoint;
        (modelForm.elements.namedItem("model") as HTMLInputElement).value =
          data.model || "";
        (
          modelForm.elements.namedItem("maxOutputTokens") as HTMLInputElement
        ).value = String(data.maxOutputTokens ?? 2048);
        (
          modelForm.elements.namedItem(
            "requestTimeoutSeconds",
          ) as HTMLInputElement
        ).value = String(data.requestTimeoutSeconds ?? 90);
        configLoaded = true;
      }
      const key = JSON.stringify(data.jobs);
      if (key !== historyKey) {
        historyKey = key;
        history.replaceChildren();
        for (const job of data.jobs) {
          const button = document.createElement("button");
          button.textContent = `${job.profiles ? job.profiles.author.name + " → " + job.profiles.reviewer.name + " / " : ""}${job.kind} / ${job.status} / ${job.id.slice(-8)}${job.parentMissionId ? " · follows " + job.parentMissionId.slice(-8) : ""}`;

          if (job.admissionReleased)
            button.textContent += " · queue released by operator";

          button.onclick = async () => {
            const selection = ++artifactSelection;
            download.hidden = true;
            download.onclick = null;
            projectDownload.hidden = true;
            projectDownload.onclick = null;
            output.textContent = "Reading selected mission…";
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
                          `${record.agent}: HTTP ${record.httpStatus || "UNKNOWN"}; finish ${record.finishReason}; ${record.contentCharacters} content characters; requested token limit ${record.requestedMaxTokens}; reasoning_content present ${record.reasoningPresent ? "yes" : "no"}; model-requested tool ${record.toolRequested === true ? "UNAVAILABLE — requested call not executed" : record.toolRequested === false ? "none" : "UNKNOWN (not recorded)"}`,
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
              if (selection !== artifactSelection) return;
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
              if (selection !== artifactSelection) return;
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
            if (selection !== artifactSelection) return;
            const bundle = projectBundleDownload(job.id, workcellEvidence);
            if (bundle) {
              projectDownload.hidden = false;
              projectDownload.onclick = () => saveDownload(bundle);
            }
            if (job.status !== "completed" && job.status !== "failed") {
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
              if (selection !== artifactSelection) return;
              const saved = artifactDownload(job.id, artifact);
              if (saved) {
                download.textContent = `Save ${saved.label}`;
                download.hidden = false;
                download.onclick = () => saveDownload(saved);
              }
              output.textContent =
                (artifact.workflowValidation
                  ? `WEBOPS REPORT CONTRACT: ${artifact.workflowValidation.status?.toUpperCase() || "UNKNOWN"}\n${artifact.workflowValidation.scope || artifact.workflowValidation.reason || ""}\nSupplied evidence only; factual accuracy not independently verified.\n\n`
                  : "") +
                (artifact.kind === "code"
                  ? `SYNTAX: ${artifact.validation?.syntax?.toUpperCase() || "UNKNOWN"} · FUNCTIONAL TESTS: ${(artifact.validation?.functionalTests || "not-run").toUpperCase()} · ${artifact.codeExecuted === null ? "EXECUTION COVERAGE UNKNOWN" : artifact.codeExecuted ? "EXECUTED IN ISOLATED BROWSER" : "CODE NOT EXECUTED"}\n${artifact.validation?.fenceRemoved ? "Outer Markdown fence removed; original response retained above.\n" : ""}\n`
                  : artifact.kind === "kujo"
                    ? `KUJO OUTPUT CHECK: ${artifact.validation?.outputCheck?.status?.toUpperCase() || "NOT REQUESTED"}\n${artifact.validation?.outputCheck ? JSON.stringify(artifact.validation.outputCheck, null, 2) + "\n" : ""}KUJO STATIC CHECK: ${artifact.validation?.syntax?.toUpperCase() || "UNKNOWN"} · ${artifact.validation?.checkedArtifact === "reviewed.kujo" ? "REVIEWED CODE" : "AUTHOR DRAFT"} · ${artifact.codeExecuted === true ? "EXECUTED IN WORKCELL" : artifact.codeExecuted === null ? "EXECUTION UNKNOWN" : "CODE NOT EXECUTED"}\nREVIEW COMMENTARY IS MODEL OPINION, NOT A TEST RESULT\n\n`
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
                functionalSummary(artifact.functional);
            } catch {
              if (selection !== artifactSelection) return;
              download.hidden = true;
              download.onclick = null;
              output.textContent = "Artifact unavailable; no result inferred.";
            }
          };
          history.append(button);
          if (job.status === "unknown" && !job.admissionReleased) {
            const release = document.createElement("button");
            release.dataset.releaseAdmission = job.id;
            release.textContent = `Release queue / keep UNKNOWN ${job.id.slice(-8)}`;
            release.onclick = async () => {
              if (replay || pending || !data.canReleaseUnknown) return;
              if (
                !window.confirm(
                  "Release the queue for new tasks? This mission stays UNKNOWN and its work may still be running. This action does not stop or rerun it.",
                )
              )
                return;
              pending = true;
              release.disabled = true;
              try {
                const response = await fetch("/control/release-admission", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-City-Command-Token": token,
                  },
                  body: JSON.stringify({
                    missionId: job.id,
                    acknowledgedPossibleOngoingWork: true,
                  }),
                });
                const result = await response.json();
                status.textContent = response.ok
                  ? "Queue released by operator. Prior mission outcome remains UNKNOWN; earlier work may still be running."
                  : result.error;
              } catch {
                status.textContent =
                  "Recovery response unavailable. Check mission history before retrying.";
              } finally {
                pending = false;
                await refresh();
              }
            };
            history.append(release);
          }
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
                workflowField.value = "";
                refreshWorkflow();
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
                  options.open = true;
                  refreshOptions();
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
      history
        .querySelectorAll<HTMLButtonElement>("[data-release-admission]")
        .forEach((button) => {
          button.disabled =
            replay ||
            pending ||
            !data.canReleaseUnknown ||
            !data.storageHealthy;
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
    let submitted = false;
    try {
      const workflow = fields.get("workflow");
      let workflowInput;
      if (workflow === "webops-report") {
        try {
          workflowInput = JSON.parse(String(fields.get("workflowInput") || ""));
        } catch {
          throw Error("Invalid site evidence JSON. No mission submitted.");
        }
      }
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
      const selectedFiles = (
        form.elements.namedItem("projectFiles") as HTMLInputElement
      ).files;
      const projectFiles = [];
      let totalFileBytes = 0;
      if (selectedFiles && selectedFiles.length > 8)
        throw Error("Select at most eight text files");
      for (const file of Array.from(selectedFiles || [])) {
        totalFileBytes += file.size;
        if (file.size > 16384 || totalFileBytes > 32768)
          throw Error(
            "Project files exceed the16 KiB per-file or32 KiB total limit",
          );
        const content = new TextDecoder("utf-8", { fatal: true }).decode(
          await file.arrayBuffer(),
        );
        projectFiles.push({ path: file.name, content });
      }
      submitted = true;
      const response = await fetch("/control/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": token,
        },
        body: JSON.stringify({
          kind:
            workflow === "webops-report"
              ? "writing"
              : parent?.kind || fields.get("kind"),
          ...(workflow === "webops-report" ? { workflow, workflowInput } : {}),
          prompt: fields.get("prompt"),
          ...(projectFiles.length ? { projectFiles } : {}),
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
          mcpReadFiles: String(fields.get("mcpReadFiles") || "")
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean),
          executeWorkcell: fields.has("executeWorkcell"),
          includeProjectFiles: fields.has("includeProjectFiles"),
          exportProjectFiles: String(fields.get("exportProjectFiles") || "")
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean),
          ...(fields.has("checkOutput")
            ? { expectedOutput: fields.get("expectedOutput") }
            : {}),
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
    } catch (error) {
      status.textContent = submitted
        ? "Submission response unavailable. Check mission history before retrying."
        : error instanceof Error
          ? error.message
          : "Invalid mission input. No mission submitted.";
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
          requestTimeoutSeconds: Number(fields.get("requestTimeoutSeconds")),
        }),
      });
      const result = await response.json();
      status.textContent = response.ok
        ? "Connection saved. A mission will verify provider access."
        : result.error;
      if (response.ok) {
        panel.querySelector<HTMLDetailsElement>("#model-settings")!.open =
          false;
        (form.elements.namedItem("prompt") as HTMLTextAreaElement).focus({
          preventScroll: true,
        });
      }
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
                  requestTimeoutSeconds: Number(
                    fields.get("requestTimeoutSeconds"),
                  ),
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
