import { readFile, readdir } from "node:fs/promises";
for (const file of await readdir("packages/world-core"))
  if (file.endsWith(".ts")) {
    const source = await readFile("packages/world-core/" + file, "utf8");
    if (
      /from\s+['"](?:node:|pixi|.*(?:gateway|integrations|renderer))|\b(?:document|window|Date\.now|performance\.now|setTimeout|fetch)\b/.test(
        source,
      )
    )
      throw Error("world-core purity boundary: " + file);
  }
console.log("Pure world-core boundary: PASS");
