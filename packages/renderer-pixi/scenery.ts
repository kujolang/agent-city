import { Graphics } from "pixi.js";

// Original pixel materials. Fixed integer patterns are visual texture only;
// they never select destinations, advertise activity, or consume runtime truth.
const P = {
  ink: 0x05080f,
  mortar: 0x202b3b,
  stone: 0x657082,
  light: 0xa6b0bc,
  roof: 0x96999e,
  brick: 0x843d32,
  rust: 0xba6044,
  blue: 0x164c9c,
  glass: 0x277ce2,
  leaf: 0x285b35,
  green: 0x5b9b46,
};
const rect = (
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
) => g.rect(x, y, w, h).fill(c);

export function masonry(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  red = false,
) {
  rect(g, x, y, w, h, P.mortar);
  for (let row = 0; row < h; row += 5)
    for (let col = 0; col < w; col += 8) {
      const left = col + ((row / 5) % 2 ? 4 : 0);
      if (left >= w) continue;
      const width = Math.min(7, w - left),
        height = Math.min(4, h - row);
      rect(g, x + left, y + row, width, height, red ? P.brick : P.stone);
      rect(g, x + left, y + row, width, 1, red ? P.rust : P.light);
      if (height > 2) rect(g, x + left + 1, y + row + 2, 1, 1, P.mortar);
    }
}

export function plant(g: Graphics, x: number, y: number) {
  rect(g, x + 2, y + 9, 6, 5, P.mortar);
  rect(g, x + 3, y + 10, 4, 1, P.light);
  for (const [dx, dy, w] of [
    [1, 3, 3],
    [5, 1, 2],
    [7, 4, 3],
    [3, 6, 5],
  ]) {
    rect(g, x + dx, y + dy, w, 3, P.leaf);
    rect(g, x + dx, y + dy, w, 1, P.green);
  }
}

// Buildings share the authored 64×64 plot and exact door coordinate, but not
// their silhouettes. Rooftop equipment and landscaping are non-semantic scenery.
export function facade(g: Graphics, x: number, y: number, id: string) {
  masonry(g, x - 2, y - 2, 68, 68);
  rect(g, x + 1, y + 1, 62, 60, 0x163626);
  for (let yy = 3; yy < 59; yy += 4)
    for (let xx = 3; xx < 61; xx += 5) rect(g, x + xx, y + yy, 1, 1, P.green);
  const left = id === "library" ? 6 : id === "dojo" ? 5 : 3;
  const roofTop = id === "workshop" ? 7 : id === "meeting" ? 9 : 3;
  const width = 64 - left * 2;
  rect(g, x + left + 3, y + roofTop + 3, width, 57 - roofTop, P.ink);
  masonry(
    g,
    x + left,
    y + 36,
    width,
    25,
    ["dispatch", "dojo", "meeting"].includes(id),
  );
  rect(g, x + left, y + roofTop, width, 35 - roofTop, P.ink);
  rect(g, x + left + 1, y + roofTop + 1, width - 2, 33 - roofTop, P.light);
  rect(g, x + left + 3, y + roofTop + 3, width - 6, 29 - roofTop, P.roof);
  for (let yy = roofTop + 4; yy < 31; yy += 3)
    for (let xx = left + 4; xx < 60 - left; xx += 4)
      rect(g, x + xx, y + yy, 1, 1, (xx + yy) % 2 ? 0x81868e : 0xc0bec0);
  // Recessed glazing with individual mullions and painted sills.
  for (const dx of [8, 18, 44, 54]) {
    if (dx + 4 >= 64 - left) continue;
    rect(g, x + dx, y + 40, 5, 12, P.ink);
    rect(g, x + dx + 1, y + 41, 3, 9, P.blue);
    rect(g, x + dx + 1, y + 41, 1, 3, P.glass);
    rect(g, x + dx + 1, y + 46, 3, 1, P.mortar);
    rect(g, x + dx - 1, y + 52, 7, 1, P.light);
  }
  const cx = x + 26,
    cy = y + 10;
  if (id === "library") {
    // Open book above a columned archive entrance.
    rect(g, cx - 1, cy, 17, 12, P.ink);
    rect(g, cx, cy + 1, 7, 9, 0xe2dfc9);
    rect(g, cx + 8, cy + 1, 7, 9, P.light);
    for (let dy = 3; dy < 9; dy += 2) {
      rect(g, cx + 2, cy + dy, 4, 1, P.stone);
      rect(g, cx + 9, cy + dy, 4, 1, P.stone);
    }
    for (const dx of [6, 22, 42, 54]) {
      rect(g, x + dx, y + 36, 4, 23, P.light);
      rect(g, x + dx + 2, y + 37, 2, 21, P.stone);
      rect(g, x + dx - 1, y + 57, 6, 3, P.mortar);
    }
  } else if (id === "dispatch") {
    // Raised central command tower and an unlit antenna, not source status.
    masonry(g, x + 24, y + 1, 20, 22);
    rect(g, x + 27, y + 3, 14, 17, P.ink);
    for (let dx = 29; dx < 40; dx += 4) {
      rect(g, x + dx, y + 6, 2, 11, P.blue);
      rect(g, x + dx, y + 7, 1, 3, P.glass);
    }
    rect(g, x + 13, y + 7, 2, 13, P.mortar);
    rect(g, x + 8, y + 9, 12, 1, P.light);
    rect(g, x + 10, y + 12, 8, 1, P.light);
    rect(g, x + 11, y + 20, 8, 3, P.ink);
  } else if (id === "workshop") {
    // Staggered sawtooth skylights, ductwork and a loading-bay facade.
    for (const dx of [8, 23, 38]) {
      rect(g, x + dx, y + 10, 12, 10, P.mortar);
      rect(g, x + dx, y + 10, 10, 2, P.light);
      rect(g, x + dx + 2, y + 12, 8, 5, P.blue);
      rect(g, x + dx + 3, y + 12, 1, 5, P.glass);
    }
    rect(g, x + 55, y + 3, 4, 19, P.stone);
    rect(g, x + 55, y + 3, 2, 19, P.light);
    rect(g, x + 54, y + 2, 6, 2, P.ink);
    for (const dx of [6, 47]) {
      rect(g, x + dx, y + 38, 12, 20, P.mortar);
      for (let dy = 40; dy < 56; dy += 3)
        rect(g, x + dx + 1, y + dy, 10, 1, P.stone);
      rect(g, x + dx + 3, y + 54, 2, 3, 0xd0a34f);
    }
  } else if (id === "mcp") {
    // Rack-house roof: monitor sign, cable channels and ventilation stacks.
    rect(g, cx, cy, 16, 12, P.ink);
    rect(g, cx + 1, cy + 1, 14, 9, P.light);
    rect(g, cx + 3, cy + 2, 10, 6, P.blue);
    rect(g, cx + 5, cy + 3, 4, 1, P.glass);
    rect(g, cx - 2, cy + 12, 20, 2, P.mortar);
    for (const dx of [8, 48]) {
      rect(g, x + dx, y + 8, 8, 15, P.mortar);
      for (let dy = 10; dy < 22; dy += 3)
        rect(g, x + dx + 1, y + dy, 6, 1, P.light);
    }
    for (let dx = 8; dx < 60; dx += 4) rect(g, x + dx, y + 37, 2, 1, P.glass);
  } else if (id === "dojo") {
    // Tiered red eaves and a broad dark lintel distinguish the evaluation hall.
    for (const [dy, inset] of [
      [3, 9],
      [9, 5],
      [16, 2],
    ]) {
      rect(g, x + inset, y + dy, 64 - inset * 2, 5, P.ink);
      rect(g, x + inset + 1, y + dy, 62 - inset * 2, 2, P.brick);
      rect(g, x + inset + 2, y + dy, 60 - inset * 2, 1, P.rust);
    }
    rect(g, x + 29, y + 9, 9, 13, P.ink);
    rect(g, x + 32, y + 11, 3, 9, P.light);
    rect(g, x + 30, y + 14, 7, 2, P.light);
    for (const dx of [5, 20, 43, 56]) {
      rect(g, x + dx, y + 36, 3, 25, P.brick);
      rect(g, x + dx, y + 36, 1, 25, P.rust);
    }
  } else {
    // Low meeting pavilion with a glazed roof lantern and broad red awning.
    rect(g, x + 20, y + 6, 27, 17, P.ink);
    rect(g, x + 22, y + 8, 23, 13, P.blue);
    for (const dx of [22, 29, 36, 43]) rect(g, x + dx, y + 8, 1, 13, P.light);
    rect(g, x + 22, y + 13, 23, 1, P.stone);
    rect(g, x + 6, y + 36, 53, 4, P.brick);
    for (let dx = 8; dx < 59; dx += 6) rect(g, x + dx, y + 36, 2, 4, P.rust);
  }
  // All door thresholds remain on the compiled portal, regardless of roof shape.
  const door = Math.floor((x + 32) / 16) * 16;
  rect(g, door, y + 43, 16, 20, P.light);
  rect(g, door + 2, y + 45, 12, 18, P.mortar);
  rect(g, door + 4, y + 47, 8, 16, P.ink);
  for (const dy of [59, 61, 63]) rect(g, door, y + dy, 16, 1, P.light);
  plant(g, x, y + 48);
  plant(g, x + 53, y + 48);
  rect(g, x + 4, y + 25, 56, 9, P.ink);
  rect(g, x + 5, y + 33, 54, 1, P.stone);
}

/** Water, stone embankments and bridge decking follow the existing authored cells. */
export function cityGround(g: Graphics, cells: number[]) {
  const road = (x: number, y: number) =>
    x >= 0 && x < 16 && y >= 0 && y < 13 && cells[y * 16 + x] === 2;
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 16; x++) {
      const px = x * 16,
        py = y * 16;
      if (!road(x, y)) {
        rect(g, px, py, 16, 16, 0x05247c);
        for (let dy = 1; dy < 16; dy += 3)
          for (let dx = (dy % 2) * 3; dx < 16; dx += 7) {
            rect(g, px + dx, py + dy, Math.min(4, 16 - dx), 1, 0x1548b8);
            if ((dx + dy) % 3 === 0)
              rect(g, px + dx, py + dy + 1, 2, 1, 0x2867df);
          }
        continue;
      }
      rect(g, px, py, 16, 16, 0x303643);
      for (const [dx, dy] of [
        [3, 3],
        [10, 8],
        [5, 13],
      ])
        rect(g, px + dx, py + dy, 1, 1, 0x454b58);
      // Narrow corridors have a paved, bridge-like deck; the open centre stays clear.
      if (!road(x - 1, y) && !road(x + 1, y)) {
        rect(g, px, py, 2, 16, P.light);
        rect(g, px + 14, py, 2, 16, P.stone);
        for (let dy = 1; dy < 16; dy += 4)
          rect(g, px + 2, py + dy, 12, 1, P.mortar);
      }
      if (!road(x, y - 1)) {
        rect(g, px, py, 16, 2, P.light);
        for (let dx = 0; dx < 16; dx += 5) rect(g, px + dx, py, 1, 2, P.mortar);
      }
      if (!road(x, y + 1)) {
        rect(g, px, py + 14, 16, 2, P.stone);
        for (let dx = 0; dx < 16; dx += 5)
          rect(g, px + dx, py + 14, 1, 2, P.mortar);
      }
    }
  // Road paint and manhole covers are passive infrastructure, not activity claims.
  for (let x = 16; x < 240; x += 24) rect(g, x, 111, 10, 1, 0xc3c3ae);
  for (const x of [20, 148, 228]) {
    rect(g, x, 117, 9, 6, P.ink);
    rect(g, x + 1, 118, 7, 4, P.stone);
    for (let dx = 2; dx < 8; dx += 2) rect(g, x + dx, 118, 1, 3, P.mortar);
  }
}

export function roomShell(g: Graphics) {
  rect(g, 8, 24, 240, 154, 0x102d4b);
  for (let y = 34; y < 175; y += 24) {
    rect(g, 12, y, 232, 1, 0x1c4260);
    for (let x = 14; x < 244; x += 30) {
      rect(g, x, y + 1, 1, 21, 0x07172a);
      rect(g, x + 2, y + 3, 1, 1, P.stone);
    }
  }
  masonry(g, 8, 24, 240, 8, true);
  masonry(g, 8, 32, 6, 146, true);
  masonry(g, 242, 32, 6, 146, true);
  for (const x of [20, 94, 166, 234]) {
    rect(g, x, 33, 1, 7, P.stone);
    rect(g, x - 4, 40, 9, 3, P.ink);
    rect(g, x - 3, 43, 7, 1, 0xd9c99c);
  }
  rect(g, 16, 34, 224, 2, P.mortar);
  rect(g, 16, 34, 224, 1, P.stone);
}

export function consoleDesk(g: Graphics, x: number, y: number, width = 30) {
  rect(g, x - 2, y, width + 4, 3, P.light);
  rect(g, x, y + 3, width, 6, P.stone);
  rect(g, x + 2, y + 9, 3, 17, P.mortar);
  rect(g, x + width - 5, y + 9, 3, 17, P.mortar);
  rect(g, x + 4, y - 16, width - 8, 15, P.ink);
  rect(g, x + 6, y - 14, width - 12, 10, P.blue);
  rect(g, x + 7, y - 13, width - 14, 1, P.glass);
  // Blank decorative screens; no fake text, progress or operation indicators.
  for (let dx = 3; dx < width - 3; dx += 4) rect(g, x + dx, y + 4, 2, 1, P.ink);
}

export function briefingRoom(g: Graphics) {
  // Empty chairs are fixtures, not invented participants or co-location.
  for (const x of [44, 88, 132, 176]) {
    rect(g, x, 130, 13, 21, P.ink);
    rect(g, x + 2, 132, 9, 13, 0x414b77);
    rect(g, x + 3, 151, 2, 17, P.stone);
    rect(g, x + 9, 151, 2, 17, P.stone);
  }
  rect(g, 38, 147, 168, 5, P.light);
  rect(g, 42, 152, 160, 8, P.stone);
  rect(g, 48, 160, 5, 15, P.mortar);
  rect(g, 188, 160, 5, 15, P.mortar);
  rect(g, 84, 144, 75, 3, P.blue);
  for (const x of [56, 174]) {
    rect(g, x, 142, 11, 5, 0xe2dfc9);
    rect(g, x + 3, 143, 6, 1, P.stone);
  }
  // Structural utility pipes and lockers frame the shared work table.
  rect(g, 16, 51, 223, 5, P.mortar);
  rect(g, 16, 51, 223, 1, P.light);
  for (const x of [16, 224]) {
    rect(g, x, 87, 12, 51, P.stone);
    rect(g, x + 2, 89, 8, 47, P.mortar);
    rect(g, x + 6, 108, 2, 6, P.light);
  }
}

export function cableTray(g: Graphics) {
  rect(g, 17, 134, 218, 4, P.ink);
  for (const y of [134, 136]) rect(g, 19, y, 214, 1, P.stone);
  for (const x of [36, 76, 116, 156, 196, 228]) {
    rect(g, x, 117, 3, 20, P.ink);
    rect(g, x + 1, 117, 1, 19, 0x986548);
  }
}

export function roomFloor(g: Graphics) {
  masonry(g, 8, 178, 240, 9, true);
  rect(g, 8, 176, 240, 2, P.light);
  rect(g, 8, 188, 240, 20, P.ink);
  for (let x = 20; x < 244; x += 40) {
    rect(g, x, 188, 4, 20, P.mortar);
    rect(g, x, 188, 1, 20, P.light);
  }
  rect(g, 8, 197, 240, 3, P.mortar);
  rect(g, 8, 197, 240, 1, P.stone);
}

export function mezzanine(g: Graphics) {
  rect(g, 16, 112, 224, 2, P.light);
  masonry(g, 16, 114, 224, 7, true);
  for (const x of [32, 104, 184]) {
    rect(g, x, 122, 4, 54, P.mortar);
    rect(g, x, 122, 1, 54, P.stone);
  }
  // The ladder's centre matches the authored x=224 walker footprint.
  for (const x of [223, 237]) {
    rect(g, x, 101, 2, 75, P.ink);
    rect(g, x, 101, 1, 75, P.light);
  }
  for (let y = 106; y < 176; y += 6) {
    rect(g, 225, y, 12, 2, P.stone);
    rect(g, 225, y, 12, 1, P.light);
  }
}

export function books(g: Graphics, x: number, y: number, w: number, h: number) {
  rect(g, x, y, w, h, 0x61432e);
  rect(g, x + 2, y + 2, w - 4, h - 4, P.ink);
  for (let shelf = y + 4; shelf < y + h - 10; shelf += 15) {
    for (let col = 0; col < Math.floor((w - 5) / 4); col++) {
      const height = 8 + (col % 3);
      rect(
        g,
        x + 3 + col * 4,
        shelf + 11 - height,
        3,
        height,
        [P.blue, P.brick, 0xb59753, P.leaf, P.light][col % 5],
      );
      rect(g, x + 3 + col * 4, shelf + 12 - height, 2, 1, 0xc2b899);
    }
    rect(g, x + 2, shelf + 11, w - 4, 2, 0xa0784b);
  }
}
