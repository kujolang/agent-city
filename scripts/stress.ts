import { Journal, sha } from "../apps/gateway/journal";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import type { CityEvent } from "../packages/protocol/index";
await mkdir(".runtime", { recursive: true });
await mkdir("evidence/hardening", { recursive: true });
const fixture: CityEvent[] = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map(JSON.parse as any);
const template = fixture.find(
  (e) =>
    "operation" in e &&
    e.operation.capability === "rag.query" &&
    e.type === "operation.finished",
)!;
const duration = Number(process.env.STRESS_SECONDS || 60),
  rate = 1000;
const dbPath = ".runtime/stress-" + Date.now() + ".sqlite";
const j = new Journal(dbPath);
const start = performance.now(),
  cpu = process.cpuUsage(),
  samples: any[] = [],
  latencies: number[] = [];
let accepted = 0;
let deadline = start;
for (let sec = 0; sec < duration; sec++) {
  for (let batch = 0; batch < 10; batch++) {
    const events = Array.from({ length: 100 }, (_, n) => {
      const i = sec * 1000 + batch * 100 + n;
      const actor = i % 25;
      if (!("operation" in template)) throw Error("fixture");
      return {
        ...template,
        eventId: "stress-" + i,
        instance: "stress:" + actor,
        source: "synthetic-stress",
        profile: "unknown",
        run: { namespace: "synthetic-stress", id: "run-" + actor },
        operation: { ...template.operation, id: "operation-" + i },
        order: i + 1,
        observedAt: i,
        occurredAt: i,
      } as CityEvent;
    });
    const t = performance.now();
    accepted += j.append(events).length;
    latencies.push(performance.now() - t);
    deadline += 100;
    await new Promise((r) =>
      setTimeout(r, Math.max(0, deadline - performance.now())),
    );
  }
  samples.push({
    second: sec + 1,
    heap: process.memoryUsage().heapUsed,
    rss: process.memoryUsage().rss,
    order: j.state.order,
  });
}
const elapsed = (performance.now() - start) / 1000;
const usage = process.cpuUsage(cpu);
const count = j.events().length;
const hash = sha(j.state);
j.close();
const sorted = latencies.sort((a, b) => a - b);
const result = {
  kind: "SYNTHETIC; direct production Journal API, not Watchdog HTTP or browser",
  targetRate: rate,
  durationSeconds: elapsed,
  accepted,
  count,
  dropped: duration * rate - count,
  eventsPerSecond: accepted / elapsed,
  batch100Ms: {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
  },
  cpuSeconds: (usage.user + usage.system) / 1e6,
  sqliteBytes: (await stat(dbPath)).size,
  semanticHash: hash,
  samples,
  limitations: [
    "Does not measure canonical Watchdog export throughput",
    "Does not measure SSE/browser delivery or GPU memory",
    "Only bounded 25-instance journal projection workload",
  ],
};
await writeFile(
  "evidence/hardening/stress.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({ ...result, samples: [samples[0], samples.at(-1)] }, null, 2),
);
