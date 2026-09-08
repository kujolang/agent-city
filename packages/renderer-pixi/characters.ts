import { Assets, Rectangle, Texture } from "pixi.js";
import source from "../../assets/source/characters.json";
import type { Animation } from "../world-core/index";

/** Original atlas projection only. No agent status, clocks or activity inference. */
export class CharacterAtlas {
  private base!: Texture;
  private frames = new Map<string, Texture>();
  async load() {
    this.base = await Assets.load<Texture>(
      new URL("../../assets/compiled/characters.png", import.meta.url).href,
    );
    this.base.source.scaleMode = "nearest";
  }
  frame(appearanceId: string, side: boolean, pose: Animation, frame: number) {
    let role = source.palettes.findIndex(([id]) => id === appearanceId);
    if (role < 0) role = source.palettes.length - 1;
    const column = Math.max(0, source.poses.indexOf(pose));
    const row = role * 8 + (side ? 4 : 0) + (frame % 4);
    const key = `${column}:${row}`;
    let texture = this.frames.get(key);
    if (!texture) {
      texture = new Texture({
        source: this.base.source,
        frame: new Rectangle(
          column * source.width,
          row * source.height,
          source.width,
          source.height,
        ),
      });
      this.frames.set(key, texture);
    }
    return texture;
  }
}
