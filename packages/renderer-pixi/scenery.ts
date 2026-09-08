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

export function facade(g: Graphics, x: number, y: number, id: string) {
  rect(g, x + 3, y + 3, 64, 64, P.ink);
  masonry(g, x - 2, y - 2, 68, 68);
  rect(g, x, y, 64, 62, P.ink);
  // Roof, raised coping, and a lower windowed facade establish a rooftop view.
  rect(g, x + 1, y + 1, 62, 39, P.light);
  rect(g, x + 3, y + 3, 58, 35, P.mortar);
  rect(g, x + 5, y + 5, 54, 30, P.roof);
  for (let dy = 6; dy < 34; dy += 3)
    for (let dx = 6; dx < 58; dx += 4)
      if ((dx + dy) % 3) rect(g, x + dx, y + dy, 1, 1, 0x81868e);
  masonry(g, x + 2, y + 40, 60, 21, id === "dispatch" || id === "meeting");
  for (const dx of [5, 15, 44, 54]) {
    rect(g, x + dx, y + 43, 6, 10, P.ink);
    rect(g, x + dx + 1, y + 44, 2, 7, P.blue);
    rect(g, x + dx + 1, y + 44, 2, 2, P.glass);
  }
  // Thresholds align with the authored grid portal and the walker footprint.
  const door = Math.floor((x + 32) / 16) * 16;
  rect(g, door, y + 43, 16, 20, P.light);
  rect(g, door + 2, y + 45, 12, 18, P.mortar);
  rect(g, door + 4, y + 47, 8, 16, P.ink);
  rect(g, door, y + 61, 16, 1, P.light);
  plant(g, x + 1, y + 50);
  plant(g, x + 51, y + 50);
  const cx = x + 26,
    cy = y + 9;
  if (id === "library") {
    rect(g, cx, cy, 15, 10, P.ink);
    rect(g, cx + 1, cy + 1, 6, 7, 0xd9d2b7);
    rect(g, cx + 8, cy + 1, 6, 7, P.light);
  } else if (id === "mcp" || id === "dispatch") {
    rect(g, cx, cy, 15, 11, P.ink);
    rect(g, cx + 1, cy + 1, 13, 8, P.light);
    rect(g, cx + 3, cy + 2, 9, 5, P.blue);
    rect(g, cx - 2, cy + 11, 19, 2, P.mortar);
  } else if (id === "workshop") {
    for (const dx of [9, 45]) {
      rect(g, x + dx, y + 5, 5, 14, P.mortar);
      rect(g, x + dx, y + 5, 3, 14, P.light);
      rect(g, x + dx - 1, y + 4, 7, 2, P.ink);
    }
  } else {
    rect(g, cx, cy, 15, 12, P.mortar);
    rect(g, cx + 2, cy + 2, 11, 8, id === "dojo" ? P.brick : P.blue);
    rect(g, cx + 6, cy + 1, 3, 10, P.light);
  }
  rect(g, x + 4, y + 25, 56, 9, P.ink);
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
