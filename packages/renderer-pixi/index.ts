import { Application, Container, Graphics, Rectangle, Sprite } from "pixi.js";
import {
  facade,
  cityGround,
  consoleDesk,
  briefingRoom,
  cableTray,
  roomShell,
  roomFloor,
  plant,
  mezzanine,
  books,
} from "./scenery";
import { appearance } from "./appearance";
import { CharacterAtlas } from "./characters";
import {
  badge,
  animationFor,
  buildingState,
  stationFor,
  compareId,
} from "../world-core/index";
import type { OperationEvent } from "../world-core/index";
import type { Presentation, Truth, Scene } from "../world-core/index";
import world from "../../assets/compiled/world.json";
const C = {
  black: 0x070c14,
  ink: 0x121d2a,
  road: 0x343e4e,
  grass: 0x101f37,
  teal: 0x2678e8,
  mint: 0xa6d8a5,
  gold: 0xe8b86a,
  red: 0xbf655c,
  white: 0xe2e4c7,
  blue: 0x398fff,
};
const glyphs: Record<string, string> = {
  A: "010101111101101",
  B: "110101110101110",
  C: "011100100100011",
  D: "110101101101110",
  E: "111100110100111",
  F: "111100110100100",
  G: "011100101101011",
  H: "101101111101101",
  I: "111010010010111",
  J: "001001001101010",
  K: "101101110101101",
  L: "100100100100111",
  M: "101111111101101",
  N: "101111111111101",
  O: "010101101101010",
  P: "110101110100100",
  Q: "010101101111011",
  R: "110101110101101",
  S: "011100010001110",
  T: "111010010010010",
  U: "101101101101111",
  V: "101101101101010",
  W: "101101111111101",
  X: "101101010101101",
  Y: "101101010010010",
  Z: "111001010100111",
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "110001010100111",
  "3": "110001010001110",
  "4": "101101111001001",
  "5": "111100110001110",
  "6": "011100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001110",
  "-": "000000111000000",
  "/": "001001010100100",
  ":": "000010000010000",
  "?": "110001010000010",
  "!": "010010010000010",
  ".": "000000000000010",
  ">": "100010001010100",
};
function text(
  g: Graphics,
  label: string,
  x: number,
  y: number,
  color = C.white,
  scale = 1,
) {
  for (const [i, c] of [...label.toUpperCase()].entries()) {
    const bits = glyphs[c];
    if (!bits) continue;
    for (let n = 0; n < 15; n++)
      if (bits[n] === "1")
        g.rect(
          x + i * 4 * scale + (n % 3) * scale,
          y + Math.floor(n / 3) * scale,
          scale,
          scale,
        ).fill(color);
  }
}
function box(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.rect(x, y, w, h).fill(color);
}
export class CityRenderer {
  app = new Application();
  scene: Scene = "city";
  follow: string | null = null;
  selected: string | null = null;
  private layer = new Container();
  private ink = new Graphics();
  private actors = new Container();
  private characters = new CharacterAtlas();
  private actorViews = new Map<
    string,
    { container: Container; sprite: Sprite; marks: Graphics; marksKey: string }
  >();
  private buildingHits = new Container();
  private actorsCreated = 0;
  private actorsDestroyed = 0;
  diagnostics() {
    const count = (node: Container): number =>
      1 + node.children.reduce((n, child) => n + count(child), 0);
    return {
      objects: count(this.app.stage),
      actors: this.actorViews.size,
      actorsCreated: this.actorsCreated,
      actorsDestroyed: this.actorsDestroyed,
      buildingHits: this.buildingHits.children.length,
      backgrounds: this.backgrounds.size,
    };
  }
  private backgrounds = new Map<string, Graphics>();
  private backgroundTruth?: Truth;
  private truthRevision = 0;
  private backdrop = new Container();
  async init(
    host: HTMLElement,
    onSelect: (id: string) => void,
    onBuilding: (id: string) => void,
  ) {
    await this.app.init({
      width: 256,
      height: 240,
      background: C.black,
      preference: "webgl",
      antialias: false,
      resolution: 1,
      autoDensity: false,
      roundPixels: true,
      autoStart: false,
    });
    await this.characters.load();
    host.append(this.app.canvas);
    this.app.stage.addChild(this.layer);
    this.layer.addChild(
      this.backdrop,
      this.ink,
      this.buildingHits,
      this.actors,
    );
    for (const o of world.maps.city.objects.filter(
      (o) => o.kind === "building",
    )) {
      const hit = new Container();
      hit.hitArea = new Rectangle(o.x, o.y, 64, 64);
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.on("pointertap", () => this.onBuilding(o.id));
      this.buildingHits.addChild(hit);
    }
    this.app.canvas.setAttribute(
      "aria-label",
      "Agent City original pixel world. Use the adjacent roster to inspect agents.",
    );
    this.onSelect = onSelect;
    this.onBuilding = onBuilding;
  }
  private onSelect = (_id: string) => {};
  private onBuilding = (_id: string) => {};
  draw(p: Presentation, truth: Truth, health: string) {
    if (this.follow && p.walkers[this.follow])
      this.scene = p.walkers[this.follow].scene;
    const g = this.ink;
    g.clear();
    // A replay/snapshot can replace truth without changing its numeric order.
    // Pure reducers preserve reference identity between changes; ticks alone do
    // not invalidate room geometry.
    if (truth !== this.backgroundTruth) {
      this.backgroundTruth = truth;
      this.truthRevision++;
    }
    this.buildingHits.visible = this.scene === "city";
    const visibleIds = new Set<string>();

    const key =
      this.scene +
      ":" +
      (this.scene === "dojo" ||
      this.scene === "mcp" ||
      this.scene === "workshop"
        ? this.truthRevision
        : 0);
    let bg = this.backgrounds.get(key);
    if (!bg) {
      bg = new Graphics();
      if (this.scene === "city") this.city(bg, 0);
      else this.room(bg, 0, truth);
      for (const [k, v] of this.backgrounds)
        if (k.startsWith(this.scene + ":")) {
          this.backdrop.removeChild(v);
          v.destroy();
          this.backgrounds.delete(k);
        }
      this.backgrounds.set(key, bg);
      this.backdrop.addChild(bg);
    }
    for (const [k, v] of this.backgrounds) v.visible = k === key;
    const allWalkers = Object.values(p.walkers);
    const aggregate = allWalkers.length > 25;
    const sceneCounts = new Map<string, number>();
    if (aggregate)
      for (const w of allWalkers)
        sceneCounts.set(w.scene, (sceneCounts.get(w.scene) ?? 0) + 1);
    if (aggregate && this.scene !== "city")
      text(
        g,
        "VISUAL " +
          (sceneCounts.get(this.scene) ?? 0) +
          " HERE / " +
          allWalkers.length +
          " TOTAL",
        8,
        198,
        C.gold,
      );
    for (const w of allWalkers.sort((a, b) => compareId(a.id, b.id))) {
      if (w.scene !== this.scene) continue;
      if (aggregate && w.id !== this.selected && w.id !== this.follow) continue;
      visibleIds.add(w.id);
      let view = this.actorViews.get(w.id);
      if (!view) {
        const actor = new Container(),
          sprite = new Sprite(),
          marks = new Graphics();
        sprite.position.set(-2, -24);
        actor.addChild(sprite, marks);
        actor.eventMode = "static";
        actor.cursor = "pointer";
        actor.hitArea = new Rectangle(-5, -36, 27, 40);
        actor.on("pointertap", () => this.onSelect(w.id));
        this.actors.addChild(actor);
        view = { container: actor, sprite, marks, marksKey: "" };
        this.actorViews.set(w.id, view);
        this.actorsCreated++;
      }
      const actor = view.container,
        marks = view.marks;
      const selected = w.id === this.selected;
      // Child order follows the same deterministic identity order after joins/removals.
      this.actors.setChildIndex(actor, visibleIds.size - 1);
      const look = appearance(truth.agents[w.id]?.profile ?? "unknown"),
        pose = animationFor(w, truth.agents[w.id], p.tick);
      const x = Math.round(w.x),
        y = Math.round(w.y + (w.scene === "city" ? 0 : 16));
      const frames =
        w.scene === "city" ? look.overworld[pose] : look.sideview[pose];
      const frame = frames[Math.floor(p.tick / 5) % frames.length];
      view.sprite.texture = this.characters.frame(
        look.id,
        w.scene !== "city",
        pose,
        frame,
      );
      const packet = !!w.packetUntil && p.tick < w.packetUntil;
      const marksKey = `${selected}:${pose === "alert" || pose === "blocked"}:${packet ? p.tick % 12 : "none"}`;
      if (view.marksKey !== marksKey) {
        marks.clear();
        view.marksKey = marksKey;
        if (selected) box(marks, -3, -27, 22, 1, C.gold);
        if (pose === "alert" || pose === "blocked")
          text(marks, "!", 6, -41, C.red);
        if (w.packetUntil && p.tick < w.packetUntil) {
          box(marks, 18 + (p.tick % 12), -25, 7, 5, C.blue);
          box(marks, 20 + (p.tick % 12), -24, 3, 1, C.white);
        }
        text(marks, badge(w.id), 0, -34, C.gold);
      }
      actor.position.set(x, y);
    }
    // Keep only detailed on-screen instances. A large semantic roster must not
    // turn into an unbounded off-screen sprite cache.
    for (const [id, view] of this.actorViews) {
      if (visibleIds.has(id)) continue;
      view.container.destroy({ children: true });
      this.actorViews.delete(id);
      this.actorsDestroyed++;
    }
    if (this.scene === "city")
      for (const o of world.maps.city.objects.filter(
        (o) => o.kind === "building",
      )) {
        const state = buildingState(
          o.id as Scene,
          truth,
          Math.max(
            ...Object.values(truth.agents).map((a) => a.lastObserved),
            0,
          ),
          health,
        );
        text(
          g,
          state.operations.length ? state.sourceHealth : "NO SOURCE",
          o.x + 8,
          Math.min(201, o.y + 68),
          state.operations.length ? C.blue : C.gold,
        );
        if (aggregate)
          text(
            g,
            "VISUAL " + (sceneCounts.get(o.id) ?? 0),
            o.x + 8,
            Math.min(202, o.y + 75),
            C.gold,
          );
      }
    box(g, 0, 208, 256, 32, C.black);
    box(g, 0, 208, 256, 1, C.teal);
    text(g, "KUJO / " + this.scene, 8, 215, C.mint);
    text(g, health, 204, 215, health === "LIVE" ? C.mint : C.gold);
    text(
      g,
      this.follow
        ? "FOLLOW > " + this.follow.split(":").at(-1)
        : "OBSERVER MODE",
      8,
      227,
      C.white,
    );
    text(g, "P1", 236, 227, C.gold);
    this.app.render();
  }
  private city(g: Graphics, tick: number) {
    const m = world.maps.city;
    cityGround(g, m.cells);
    for (const o of m.objects) {
      if (o.kind !== "building") continue;
      const x = o.x,
        y = o.y;
      facade(g, x, y, o.id);
      const label =
        o.id === "library"
          ? "LIBRARY"
          : o.id === "dispatch"
            ? "DISPATCH HQ"
            : o.id === "mcp"
              ? "MCP TERMINAL"
              : o.id.toUpperCase();
      text(g, label, x + 5, y + 27, C.white);
    }
    text(g, "AGENT CITY", 80, 3, C.white);
    box(g, 245, 91, 3, 8, Math.floor(tick / 15) % 2 ? C.mint : C.teal);
  }
  private room(g: Graphics, tick: number, truth: Truth) {
    const library = this.scene === "library",
      mcp = this.scene === "mcp",
      dojo = this.scene === "dojo",
      dispatch = this.scene === "dispatch",
      meeting = this.scene === "meeting";
    text(
      g,
      library
        ? "LIBRARY / KNOW"
        : mcp
          ? "MCP TERMINAL / ACT"
          : dojo
            ? "DOJO / VERIFY"
            : dispatch
              ? "DISPATCH / COORDINATE"
              : meeting
                ? "HANDOFF / CONTEXT"
                : "WORKSHOP / WORK",
      12,
      10,
      C.mint,
    );
    roomShell(g);
    if (dispatch || meeting) {
      const labels = dispatch
        ? ["INTAKE", "ASSIGN", "WORKFLOW", "RETRY", "BLOCK", "DONE"]
        : ["CONTEXT", "RELATION", "EVIDENCE"];
      labels.forEach((label, i) => {
        const x = dispatch ? 18 + i * 38 : 24 + i * 76;
        box(g, x, 58, dispatch ? 32 : 64, dispatch ? 59 : 42, C.black);
        box(g, x + 2, 60, dispatch ? 28 : 60, 1, C.blue);
        text(g, label, x + 2, 43, C.gold);
        for (let y = 70; y < (dispatch ? 110 : 96); y += 12)
          box(g, x + 5, y, dispatch ? 21 : 50, 2, C.teal);
        if (dispatch) consoleDesk(g, x + 1, 145, 28);
      });
      if (meeting) briefingRoom(g);
      text(
        g,
        meeting ? "ASYNC / NO CO-LOCATION CLAIM" : "SOURCE-OWNED TASK STATE",
        18,
        166,
        C.white,
      );
    } else if (dojo) {
      ["schema", "content", "policy", "skipped"].forEach((name, i) => {
        const x = 22 + i * 56;
        box(g, x, 62, 46, 90, C.black);
        box(g, x - 2, 60, 50, 2, 0x9d6443);
        box(g, x - 2, 60, 2, 94, 0x9d6443);
        box(g, x + 46, 60, 2, 94, 0x6d412e);
        text(g, name, x + 4, 48, C.gold);
        const ops = Object.values(truth.agents)
          .flatMap((a) => Object.values(a.operations))
          .filter(
            (o) =>
              o.capability === "evaluation.run" &&
              stationFor({
                id: o.operationId ?? "",
                attempt: o.attempt ?? 1,
                capability: "evaluation.run",
                collection:
                  o.collection as OperationEvent["operation"]["collection"],
                outcome: "unknown",
                metadata: o.metadata,
              }) === name,
          );
        const failed = ops.some((o) => o.status === "failed"),
          passed = ops.some((o) => o.status === "succeeded");
        text(g, failed ? "FAIL" : "----", x + 16, 82, failed ? C.red : C.teal);
        text(
          g,
          passed ? "PASS" : "----",
          x + 16,
          102,
          passed ? C.mint : C.teal,
        );
        box(g, x + 4, 135, 38, 6, C.teal);
        if (ops.some((o) => o.status === "skipped"))
          text(g, "SKIP", x + 14, 120, C.gold);
      });
      text(g, "ACTUAL CHECK OUTCOMES", 48, 165, C.white);
    } else if (library) {
      ["DOCS", "REPO", "RAG", "RUNS", "EXT"].forEach((label, i) => {
        const x = 24 + i * 40;
        books(g, x, 49, 31, 52);
        text(g, label, x + 3, 38, C.gold);
      });
      // Lower reading room: background shelving, a query station and reading desks.
      books(g, 40, 125, 42, 42);
      books(g, 168, 125, 42, 42);
      box(g, 106, 162, 52, 4, 0x997552);
      for (const x of [109, 150]) box(g, x, 166, 3, 10, C.road);
      box(g, 118, 139, 23, 21, C.black);
      box(g, 121, 142, 17, 13, C.blue);
      for (let y = 145; y < 153; y += 3) box(g, 123, y, 11, 1, C.white);
      text(g, "QUERY", 113, 128, C.gold);
      mezzanine(g);
    } else if (mcp) {
      for (let x = 24; x < 240; x += 40) {
        box(g, x, 47, 27, 88, C.black);
        for (let y = 52; y < 128; y += 15) {
          box(g, x + 3, y, 20, 11, C.road);
          box(
            g,
            x + 5,
            y + 3,
            3,
            3,
            Math.floor(tick / 12) % 2 ? C.teal : C.mint,
          );
          box(g, x + 12, y + 4, 9, 1, C.gold);
        }
      }
      cableTray(g);
      const calls = Object.values(truth.agents)
        .flatMap((a) => Object.values(a.operations))
        .filter((o) => o.capability === "mcp.call");
      text(
        g,
        calls.length ? "MCP / OBSERVED CALLS" : "NO LIVE SOURCE",
        48,
        143,
        C.gold,
      );
      text(
        g,
        calls.length
          ? String(calls.length) + " CALLS / INSPECT EVIDENCE"
          : "NOT YET CONNECTED",
        30,
        154,
        C.white,
      );
      ["SERVER", "ABILITY", "APPROVE", "ACTIVE", "RESULT", "FAIL"].forEach(
        (v, i) => text(g, v, 24 + i * 40, 38, C.gold),
      );
    } else {
      books(g, 55, 50, 39, 52);
      text(g, "EVIDENCE", 51, 39, C.gold);
      box(g, 134, 48, 69, 57, C.black);
      box(g, 138, 52, 61, 49, C.road);
      for (let y = 55; y < 100; y += 7) box(g, 141, y, 55, 1, 0x56677b);
      text(g, "WORKCELL", 140, 64, C.gold);
      const workcell = Object.values(truth.agents)
        .flatMap((a) => Object.values(a.operations))
        .filter((o) => o.capability === "workcell.execute")
        .at(-1);
      text(
        g,
        workcell ? workcell.status.toUpperCase() : "NO SOURCE",
        141,
        80,
        workcell?.status === "failed" ? C.red : C.white,
      );
      for (const x of [45, 125]) {
        box(g, x, 162, 54, 5, 0x997552);
        box(g, x + 4, 167, 3, 9, C.road);
        box(g, x + 46, 167, 3, 9, C.road);
        box(g, x + 14, 138, 25, 23, C.black);
        box(g, x + 17, 141, 19, 14, C.blue);
        for (let y = 144; y < 153; y += 3) box(g, x + 19, y, 13, 1, C.mint);
      }
      text(g, "TASK BENCH", 44, 128, C.gold);
      text(g, "TERMINAL", 128, 128, C.gold);
      mezzanine(g);
    }
    roomFloor(g);
    plant(g, 26, 161);
    plant(g, 229, 161);
    box(g, 10, 140, 13, 37, C.black);
    text(g, "EXIT", 10, 128, C.gold);
  }
}
