import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const names = ["city", "workshop", "library", "mcp", "dojo"];
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
      (o.y !== 112 || o.x % 16 !== 0 || cells[7 * 16 + o.x / 16] !== 2)
    )
      throw Error("portal is not on the navigation corridor");
  }
  maps[name] = { width: m.width, height: m.height, cells, objects };
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
for (let x = 0; x < 16; x++)
  graph[x + ",7"] = [x - 1, x + 1]
    .filter((n) => n >= 0 && n < 16)
    .map((n) => n + ",7");
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
  "5 maps: reciprocal portals, IDs, bounds, supported tiles verified",
);
