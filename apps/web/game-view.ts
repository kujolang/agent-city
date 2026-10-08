/** Local presentation control only. Does not read or change runtime truth. */
export function mountGameView(world: HTMLElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "game-fullscreen";
  button.textContent = "Fullscreen game";
  button.setAttribute("aria-pressed", "false");
  const message = document.createElement("span");
  message.id = "game-view-status";
  message.setAttribute("role", "status");
  world.querySelector("nav")!.append(button, message);
  const refresh = () => {
    const active = document.fullscreenElement === world;
    button.textContent = active ? "Exit fullscreen" : "Fullscreen game";
    button.setAttribute("aria-pressed", String(active));
    message.textContent = active ? "Esc returns to the full inspector." : "";
  };
  document.addEventListener("fullscreenchange", refresh);
  button.onclick = async () => {
    try {
      if (document.fullscreenElement === world) await document.exitFullscreen();
      else await world.requestFullscreen();
    } catch {
      message.textContent =
        "Fullscreen unavailable. The game and inspector remain usable here.";
    }
  };
}
