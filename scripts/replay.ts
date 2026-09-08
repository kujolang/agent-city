import { readFile, stat } from "node:fs/promises";
import { sha } from "../apps/gateway/journal";
import { validateEvent } from "../packages/protocol/index";
import { verifyReplay, type ReplayBundle } from "../packages/world-core/replay";
const path = process.argv[2];
if (!path) throw Error("Usage: npm run replay -- bundle.json");
if ((await stat(path)).size > 32 * 1024 * 1024)
  throw Error("Replay file exceeds 32MiB bound");
const bundle: ReplayBundle = JSON.parse(await readFile(path, "utf8"));
const { checksum, ...body } = bundle;
if (sha(body) !== checksum) throw Error("Replay checksum mismatch");
if (
  bundle.versions.coreHash !==
    sha(await readFile("packages/world-core/index.ts", "utf8")) ||
  bundle.versions.mapHash !==
    sha(JSON.parse(await readFile("assets/compiled/world.json", "utf8"))) ||
  bundle.versions.adapter !== "1"
)
  throw Error("Pinned implementation/map/adapter mismatch");
for (const e of bundle.events) validateEvent(e);
const truth = verifyReplay(bundle);
console.log(
  JSON.stringify(
    {
      mode: "REPLAY",
      events: bundle.events.length,
      instances: Object.keys(truth.agents).length,
      semanticHash: sha(truth),
      bundleChecksum: checksum,
      completeness: bundle.completeness,
    },
    null,
    2,
  ),
);
