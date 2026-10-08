import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  plan,
  initialPresentation,
  advance,
} from "../packages/world-core/index.ts";
import { canonical } from "../packages/world-core/replay.ts";
const events = JSON.parse(
  await readFile("evidence/world-levels/replay.json", "utf8"),
).events.filter((e: any) => e.type.startsWith("operation."));
let state = initialPresentation();
const begin = performance.now();
for (let i = 0; i < 2500; i++) {
  const original = events[i % events.length];
  state = plan(state, {
    ...original,
    eventId: `bounded-profile-${i}`,
    order: i + 1,
    instance: `profile:worker-${i % 25}`,
    occurredAt: i * 2,
    observedAt: i * 2,
  });
  if (i % 10 === 0) state = advance(state);
}
const result = {
  kind: "Synthetic deterministic planner equivalence and diagnostic timing; no source work",
  events: 2500,
  elapsedMs: performance.now() - begin,
  hash: createHash("sha256").update(canonical(state)).digest("hex"),
};
await writeFile(process.argv[2], JSON.stringify(result, null, 2) + "\n");
console.log(result);
