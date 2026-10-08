/** Ordinary DOM review of an actual exact candidate, never model-authored approval. */
export async function showVideoopsReview(
  host: HTMLElement,
  id: string,
  token: string,
  isCurrent: () => boolean,
) {
  host.replaceChildren();
  const response = await fetch(
    "/control/videoops/review/" + encodeURIComponent(id),
  );
  if (!response.ok || !isCurrent()) return;
  const data = await response.json();
  if (!isCurrent()) return;
  const sha = data.status?.candidate?.sha256;
  const caps = data.status?.candidate?.mandatory_capabilities;
  if (!/^[a-f0-9]{64}$/.test(sha) || !Array.isArray(caps)) return;
  const section = document.createElement("section");
  section.setAttribute("aria-label", "Video production review");
  section.innerHTML = `<h3>VIDEO REVIEW</h3><p class="review-state" role="status"></p><video controls preload="metadata" style="max-width:100%;width:640px" aria-label="Exact rendered review candidate"></video><p class="candidate-id"></p><p>Technical checks do not establish visual or audio quality. Record your own review of this exact video. This does not publish it.</p><form><label>Your name <input name="reviewer" required maxlength="128"></label><label>Outcome <select name="outcome"><option value="REVIEW_INCOMPLETE">Review incomplete</option><option value="PASS">Pass</option><option value="FAIL">Fail — revision needed</option></select></label><div class="review-capabilities"></div><label>Review notes <textarea name="notes" required maxlength="8192"></textarea></label><label>Defects, one per line (required for Fail) <textarea name="defects" maxlength="16384"></textarea></label><label><input type="checkbox" name="confirmed" required>I am recording my own review of the displayed candidate.</label><button>Record review</button></form>`;
  section.querySelector("video")!.src =
    "/control/videoops/video/" + encodeURIComponent(id);
  section.querySelector(".candidate-id")!.textContent =
    "Candidate SHA-256: " + sha;
  const state = section.querySelector<HTMLElement>(".review-state")!;
  state.textContent = `${data.status.state} · Technical: ${data.status.technical} · Perceptual: ${data.status.perceptual}`;
  for (const cap of caps) {
    if (!["visual_playback", "audio_listening"].includes(cap)) continue;
    const label = document.createElement("label"),
      box = document.createElement("input");
    box.type = "checkbox";
    box.name = cap;
    label.append(
      box,
      cap === "visual_playback"
        ? " I watched the entire candidate"
        : " I listened to the entire candidate",
    );
    section.querySelector(".review-capabilities")!.append(label);
  }
  const form = section.querySelector("form")!,
    button = form.querySelector("button")!;
  const finalButton = document.createElement("button");
  finalButton.type = "button";
  finalButton.textContent = "Finalize approved video";
  const download = document.createElement("a");
  download.textContent = "Download approved final video";
  download.href = "/control/videoops/final/" + encodeURIComponent(id);
  download.hidden = true;
  section.append(finalButton, download);
  function finalState(status: any) {
    const promoted = !!status.candidate?.promotion;
    finalButton.hidden = status.state !== "APPROVED" || promoted;
    download.hidden = status.state !== "APPROVED" || !promoted;
    form.hidden = promoted;
  }
  finalState(data.status);
  finalButton.onclick = async () => {
    if (!isCurrent()) return;
    finalButton.disabled = true;
    try {
      const response = await fetch(
        "/control/videoops/finalize/" + encodeURIComponent(id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-City-Command-Token": token,
          },
          body: JSON.stringify({ candidateSha256: sha, confirmed: true }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Finalization unavailable");
      if (result.status !== "completed" || result.final?.sha256 !== sha)
        throw Error("Final artifact confirmation unavailable");
      finalButton.hidden = true;
      form.hidden = true;
      download.hidden = false;
      state.textContent =
        "Completed · Exact approved final video saved locally · Not published";
    } catch (error) {
      state.textContent =
        error instanceof Error ? error.message : "Finalization unavailable";
    } finally {
      finalButton.disabled = false;
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!isCurrent()) return;
    button.disabled = true;
    const values = new FormData(form);
    try {
      const reply = await fetch(
        "/control/videoops/review/" + encodeURIComponent(id),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-City-Command-Token": token,
          },
          body: JSON.stringify({
            candidateSha256: sha,
            reviewer: values.get("reviewer"),
            outcome: values.get("outcome"),
            notes: values.get("notes"),
            capabilities: caps.filter(
              (cap: string) => values.get(cap) === "on",
            ),
            defects: String(values.get("defects") || "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            confirmed: values.get("confirmed") === "on",
          }),
        },
      );
      const result = await reply.json();
      if (!reply.ok) throw Error(result.error || "Review not recorded");
      finalState(result.status);
      state.textContent = `${result.status.state} · Technical: ${result.status.technical} · Perceptual: ${result.status.perceptual}`;
    } catch (error) {
      state.textContent =
        error instanceof Error ? error.message : "Review unavailable";
    } finally {
      button.disabled = false;
    }
  };
  host.append(section);
}
