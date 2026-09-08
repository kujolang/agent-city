import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const template = JSON.parse(
  readFileSync(
    new URL(
      "../../watchdog/tests/fixtures/telemetry-v2/canonical-minimal.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function batch(
  offset: number,
  count: number,
  source = "synthetic-pipeline",
) {
  return {
    ...template,
    batch_id: source + ":batch:" + offset,
    producer: { ...template.producer, name: "agent-city-sdk" },
    records: Array.from({ length: count }, (_, n) => {
      const i = offset + n,
        actor = i % 25;
      return {
        ...template.records[0],
        record_id: source + ":event:" + i,
        trace_id: hash(source + ":" + actor).slice(0, 32),
        source: { producer: "agent-city-sdk" },
        references: [
          {
            type: "agent",
            namespace: source,
            id: "worker-" + actor,
            relation: "actor",
          },
          {
            type: "run",
            namespace: source,
            id: "run-" + actor,
            relation: "groups",
          },
          {
            type: "task",
            namespace: source,
            id: "task-" + actor,
            relation: "groups",
          },
        ],
        attributes: {
          "watchdog.native.event_kind": "internal",
          "kujo.workspace.id": "local-agent-city",
          "kujo.producer.instance": source,
          "kujo.lifecycle.phase": "finished",
          "kujo.operation.id": "op-" + i,
          "kujo.operation.attempt": 1,
          "kujo.source.occurred_at_ms": i,
          "kujo.capability": "rag.query",
          "kujo.lifecycle.outcome": i % 97 === 0 ? "failed" : "succeeded",
          "kujo.collection.id": "unknown",
          "kujo.profile.id": "unknown",
          "kujo.task.binding": "explicit",
        },
      };
    }),
  };
}
