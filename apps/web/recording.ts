export function mountRecording(host: HTMLElement) {
  const button = document.createElement("button");
  button.textContent = "Record game video";
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  status.textContent =
    "Canvas only · no audio/chat · maximum 5 minutes / 64 MiB";
  host.append(button, status);
  let recorder: MediaRecorder | undefined;
  button.onclick = () => {
    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }
    const canvas = document.querySelector<HTMLCanvasElement>("#canvas canvas");
    if (!canvas?.captureStream || typeof MediaRecorder === "undefined") {
      status.textContent = "Recording unavailable in this browser or renderer.";
      return;
    }
    const stream = canvas.captureStream(20);
    const chunks: Blob[] = [];
    let size = 0;
    try {
      const mimeType = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType) throw Error("No supported video format");
      const current = (recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1_500_000,
      }));
      const timer = setTimeout(() => {
        if (current.state === "recording") current.stop();
      }, 300_000);
      current.ondataavailable = (e) => {
        if (size + e.data.size <= 64 * 1024 * 1024) {
          chunks.push(e.data);
          size += e.data.size;
        } else {
          status.textContent = "Recording size limit reached.";
          if (current.state === "recording") current.stop();
        }
      };
      current.onerror = () => {
        status.textContent =
          "Recording failed; any available video will be offered.";
      };
      current.onstop = () => {
        clearTimeout(timer);
        stream.getTracks().forEach((t) => t.stop());
        button.textContent = "Record game video";
        if (!chunks.length) {
          status.textContent = "No video captured.";
          return;
        }
        const url = URL.createObjectURL(new Blob(chunks, { type: mimeType }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-city-${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
        a.textContent = "Download captured game video";
        status.replaceChildren(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.removeAttribute("href");
          a.textContent = "Download link expired; record again if needed.";
        }, 300_000);
      };
      current.start(1000);
      button.textContent = "Stop / save video";
      status.textContent =
        "RECORDING · game canvas only · keep this tab visible";
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      status.textContent = "Video recording could not start.";
    }
  };
}
