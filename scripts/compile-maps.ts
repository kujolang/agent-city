import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const names = [
  "city",
  "workshop",
  "library",
  "mcp",
  "dojo",
  "dispatch",
  "meeting",
];
const maps: Record<string, any> = {};
for (const name of names) {
  const m = JSON.parse(await readFile(`assets/source/${name}.tmj`, "utf8"));
  if (
    m.infinite ||
    m.orientation !== "orthogonal" ||
    m.tilewidth !== 16 ||
    m.tileheight !== 16
  )
    throw Error("unsupported map");
  const set = JSON.parse(
    await readFile("assets/source/" + m.tilesets[0].source, "utf8"),
  );
  const cells = m.layers[0].data;
  if (
    cells.length !== m.width * m.height ||
    cells.some((id: number) => id < 0 || id > set.tilecount)
  )
    throw Error("tile bounds or unsupported flip flags");
  const objects = m.layers[1].objects.map((o: any) => ({
    id: o.name,
    x: o.x,
    y: o.y,
    ...Object.fromEntries(o.properties.map((p: any) => [p.name, p.value])),
  }));
  if (new Set(objects.map((o: any) => o.id)).size !== objects.length)
    throw Error("duplicate semantic ID");
  for (const o of objects)
    if (o.x < 0 || o.x >= 256 || o.y < 0 || o.y >= 208)
      throw Error("unreachable semantic object");
  for (const o of objects) {
    if (
      name !== "city" &&
      o.kind === "station" &&
      (o.y !== 160 ||
        o.x < 16 ||
        o.x > 224 ||
        cells[11 * 16 + Math.floor(o.x / 16)] !== 3)
    )
      throw Error("station has no reachable supported floor");
    if (
      name === "city" &&
      o.kind === "portal" &&
      (o.y % 16 !== 0 ||
        o.x % 16 !== 0 ||
        cells[(o.y / 16) * 16 + o.x / 16] !== 2)
    )
      throw Error("portal is not on the navigation corridor");
  }
  const navigation: Record<string, string[]> = {};
  if (name !== "city")
    for (let x = 16; x <= 224; x += 4)
      navigation[x + ",160"] = [x - 4, x + 4]
        .filter((n) => n >= 16 && n <= 224)
        .map((n) => n + ",160");
  maps[name] = { width: m.width, height: m.height, cells, objects, navigation };
}
for (const [name, m] of Object.entries(maps))
  for (const o of m.objects)
    if (o.kind === "portal") {
      const [scene, id] = o.target.split(":");
      if (
        maps[scene]?.objects.find((p: any) => p.id === id)?.target !==
        name + ":" + o.id
      )
        throw Error("nonreciprocal portal");
    }
const graph: Record<string, string[]> = {};
for (let y = 0; y < 13; y++)
  for (let x = 0; x < 16; x++) {
    if (maps.city.cells[y * 16 + x] !== 2) continue;
    graph[x + "," + y] = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]
      .filter(
        ([nx, ny]) =>
          nx >= 0 &&
          nx < 16 &&
          ny >= 0 &&
          ny < 13 &&
          maps.city.cells[ny * 16 + nx] === 2,
      )
      .map(([nx, ny]) => nx + "," + ny)
      .sort();
  }
const reached = new Set<string>(),
  pending = [Object.keys(graph)[0]];
while (pending.length) {
  const point = pending.pop()!;
  if (reached.has(point)) continue;
  reached.add(point);
  pending.push(...graph[point]);
}
for (const portal of maps.city.objects.filter((o: any) => o.kind === "portal"))
  if (!reached.has(portal.x / 16 + "," + portal.y / 16))
    throw Error("Disconnected city doorway: " + portal.id);
const body = JSON.stringify({ maps, graph });
await writeFile(
  "assets/compiled/world.json",
  JSON.stringify(
    { maps, graph, hash: createHash("sha256").update(body).digest("hex") },
    null,
    2,
  ) + "\n",
);
console.log(
  "7 maps: reciprocal portals, IDs, bounds, supported tiles verified",
);
