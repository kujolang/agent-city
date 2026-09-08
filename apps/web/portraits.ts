import characters from "../../assets/source/characters.json";
import { appearance } from "../../packages/renderer-pixi/appearance";

// Decorative identity portrait; never a runtime status or an animation authority.
export function portrait(profile: string, large = false) {
  const look = appearance(profile);
  const index = characters.palettes.findIndex(([id]) => id === look.id);
  const role = index < 0 ? characters.palettes.length - 1 : index;
  const scale = large ? 6 : 2;
  const el = document.createElement("span");
  el.className = "agent-portrait" + (large ? " large" : "");
  el.setAttribute("aria-hidden", "true");
  el.style.backgroundImage = `url(${new URL("../../assets/compiled/characters.png", import.meta.url).href})`;
  el.style.backgroundSize = `${characters.width * characters.poses.length * scale}px ${characters.height * 8 * characters.palettes.length * scale}px`;
  el.style.backgroundPosition = `0 ${-role * characters.height * 8 * scale}px`;
  return el;
}
