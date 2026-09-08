import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createHash } from "node:crypto";
import canonical from "../../integrations/kujo/watchdog.schema.json";
import { validateEvent, type CityEvent } from "../../packages/protocol/index";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
const validate = ajv.compile({
  $schema: canonical.$schema,
  $defs: canonical.$defs,
  $ref: "#/$defs/record",
});
export class UnboundObservation extends Error {}
export function normalize(
  wrapper: any,
  order: number,
  observedAt: number,
  sourcePrefix = "",
): CityEvent | null {
  if (
    wrapper.jsonl_version !== "watchdog.telemetry.jsonl.v2" &&
    wrapper.jsonl_version !== "watchdog.jsonl.v2"
  )
    throw Error("unsupported export " + wrapper.jsonl_version);
  if (
    wrapper.schema_version !== "watchdog.telemetry.v2" ||
    !validate(wrapper.record)
  )
    throw Error("canonical schema rejected");
  const r = wrapper.record,
    a = r.attributes ?? {};
  if (
    a["kujo.workspace.id"] !== "local-agent-city" ||
    r.source.producer !== "agent-city-sdk"
  )
    return null;
  const source = a["kujo.producer.instance"];
  if (sourcePrefix && !String(source).startsWith(sourcePrefix)) return null;
  const get = (type: string) => r.references.find((x: any) => x.type === type);
  const actor = get("agent"),
    run = get("run"),
    task = get("task");
  if (
    !actor ||
    !run ||
    !task ||
    actor.namespace !== source ||
    run.namespace !== source
  )
    throw new UnboundObservation("unknown execution binding");
  const nativeKind = r.attributes["watchdog.native.event_kind"];
  const expected: Record<string, string> = {
    agent: "agent.run",
    retrieval: "rag.query",
    tool: "tool.execute",
    handoff: "agent.handoff",
    evaluation: "evaluation.run",
    execution: "execution.run",
  };
  if (
    nativeKind !== "internal" &&
    expected[nativeKind] !== a["kujo.capability"]
  )
    throw new UnboundObservation("native capability mismatch");
  const phase = a["kujo.lifecycle.phase"];
  if (phase === "gap") {
    const e = {
      schema: "agent-city.event.v1",
      workspace: "local-agent-city",
      eventId: digest(source + ":" + r.record_id),
      source,
      order,
      occurredAt: a["kujo.source.occurred_at_ms"] ?? null,
      observedAt,
      completeness: "partial",
      type: "source.gap",
      reason: "overflow",
      evidence: [
        {
          origin: "canonical",
          recordId: r.record_id,
          hash: digest(JSON.stringify(r)),
          sourceSequence: wrapper.sequence,
        },
      ],
    };
    validateEvent(e);
    return e;
  }
  if (!["started", "finished"].includes(phase))
    throw new UnboundObservation("unknown lifecycle phase");
  const outcome = a["kujo.lifecycle.outcome"];
  const e = {
    schema: "agent-city.event.v1",
    eventId: digest(source + ":" + r.record_id),
    workspace: "local-agent-city",
    source,
    order,
    occurredAt: a["kujo.source.occurred_at_ms"] ?? null,
    observedAt,
    completeness: "complete",
    type:
      phase === "started"
        ? "operation.started"
        : outcome === "failed"
          ? "operation.failed"
          : "operation.finished",
    instance: source + ":" + run.id + ":" + actor.id,
    profile: a["kujo.profile.id"] || "local-documentation-worker",
    run: { namespace: run.namespace, id: run.id },
    task:
      a["kujo.task.binding"] === "explicit"
        ? { namespace: task.namespace, id: task.id }
        : { namespace: "unknown", id: "unknown" },
    operation: {
      id: a["kujo.operation.id"],
      attempt: a["kujo.operation.attempt"],
      capability: a["kujo.capability"],
      collection: a["kujo.collection.id"] ?? "unknown",
      relatedAgent: a["kujo.related.agent"] ?? "",
      outcome,
    },
    evidence: [
      {
        origin: "canonical",
        recordId: r.record_id,
        hash: digest(JSON.stringify(r)),
        sourceSequence: wrapper.sequence,
      },
    ],
  };
  try {
    validateEvent(e);
  } catch {
    throw new UnboundObservation("incomplete lifecycle metadata");
  }
  return e;
}
