/** Explicit local file selection; never reads host paths or fetches remote media. */
export function mountVideoopsMediaUpload(
  host: HTMLElement,
  getToken: () => string,
  onSaved: (pack: { id: string; name: string }) => void,
) {
  const details = document.createElement("details");
  details.innerHTML = `<summary>Add your own product media</summary><form><label>Pack name <input name="name" maxlength="120" required></label><label>Visual direction <textarea name="style" maxlength="7000" required>Keep the supplied product imagery recognizable. Preserve pixel detail; do not recreate a generic background.</textarea></label><label>Rights/license and permitted use <textarea name="rights" maxlength="800" required></textarea></label><label>Images, footage, fonts or approved audio <input name="files" type="file" multiple accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mp3,.wav,.ogg,.m4a,.ttf,.woff,.woff2" required></label><p>Up to 8 files, 4 MiB each, 12 MiB total. Audio needs an explicit role and duration. Supply the license/attribution in the rights field. This stores a local immutable pack; it does not generate media or publish anything.</p><div class="media-descriptions"></div><button>Save local media pack</button><p role="status"></p></form>`;
  host.append(details);
  const form = details.querySelector("form")!,
    files = form.querySelector<HTMLInputElement>('[name="files"]')!,
    rows = form.querySelector<HTMLElement>(".media-descriptions")!,
    status = form.querySelector<HTMLElement>('[role="status"]')!,
    button = form.querySelector("button")!;
  let descriptions: {
    file: File;
    description: HTMLInputElement;
    role?: HTMLSelectElement;
    duration?: HTMLInputElement;
  }[] = [];
  files.onchange = () => {
    rows.replaceChildren();
    descriptions = [];
    for (const file of Array.from(files.files ?? []).slice(0, 9)) {
      const label = document.createElement("label");
      label.textContent = file.name + " — description ";
      const description = document.createElement("input");
      description.required = true;
      description.maxLength = 1000;
      description.value = file.name;
      label.append(description);
      rows.append(label);
      const entry: (typeof descriptions)[number] = { file, description };
      if (/\.(mp3|wav|ogg|m4a)$/i.test(file.name)) {
        const roleLabel = document.createElement("label");
        roleLabel.textContent = "Audio role ";
        const role = document.createElement("select");
        role.required = true;
        for (const [value, text] of [
          ["", "Choose audio role"],
          ["voice", "Voice / narration"],
          ["music", "Music"],
          ["sfx", "Sound effect"],
        ]) {
          const o = document.createElement("option");
          o.value = value;
          o.textContent = text;
          role.append(o);
        }
        roleLabel.append(role);
        rows.append(roleLabel);
        const durationLabel = document.createElement("label");
        durationLabel.textContent = "Source duration in seconds ";
        const duration = document.createElement("input");
        duration.type = "number";
        duration.min = "0.01";
        duration.max = "600";
        duration.step = "0.01";
        duration.required = true;
        durationLabel.append(duration);
        rows.append(durationLabel);
        Object.assign(entry, { role, duration });
      }
      descriptions.push(entry);
    }
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = "Verifying and storing selected files…";
    try {
      if (
        !descriptions.length ||
        descriptions.length > 8 ||
        descriptions.some((d) => d.file.size > 4 * 1024 * 1024) ||
        descriptions.reduce((s, d) => s + d.file.size, 0) > 12 * 1024 * 1024
      )
        throw Error(
          "Media limits exceeded: 8 files, 4 MiB each, 12 MiB total.",
        );
      const assets = [];
      for (const d of descriptions) {
        const dataBase64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1]);
          r.onerror = () => reject(Error("Could not read selected file"));
          r.readAsDataURL(d.file);
        });
        assets.push({
          name: d.file.name,
          description: d.description.value,
          dataBase64,
          ...(d.role
            ? {
                audioRole: d.role.value,
                durationSeconds: Number(d.duration!.value),
              }
            : {}),
        });
      }
      const data = new FormData(form);
      const response = await fetch("/control/videoops-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-City-Command-Token": getToken(),
        },
        body: JSON.stringify({
          name: data.get("name"),
          styleIntake: data.get("style"),
          rights: data.get("rights"),
          assets,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Media upload failed");
      onSaved(result);
      status.textContent =
        "Saved and selected " +
        result.name +
        ". No generation or publication occurred.";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Media upload failed";
    } finally {
      button.disabled = false;
    }
  };
}
