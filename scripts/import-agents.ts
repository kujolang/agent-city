import { resolve } from "node:path";
import { importCatalog, saveCatalog } from "../apps/runner/agent-catalog";
import { localRuntime } from "./local-ports";
const args = process.argv.slice(2);
if (args.length > 1) throw Error("Usage: agents:import [/path/to/kujo-agents]");
const root = resolve(import.meta.dirname, "..");
const catalog = await importCatalog(
  resolve(args[0] || resolve(root, "../kujo-agents")),
);
await saveCatalog(
  resolve(localRuntime(root), "control/agent-catalog.json"),
  catalog,
);
console.log(
  JSON.stringify({
    imported: catalog.profiles.length,
    teams: [...new Set(catalog.profiles.map((p) => p.team))],
    registryHash: catalog.source.registryHash,
    execution:
      "NOT_CONNECTED: contracts imported; no permissions or tools granted",
  }),
);
