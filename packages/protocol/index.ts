import Ajv from "ajv";
import schema from "./event.schema.json";
export type { CityEvent } from "./generated";
import type { CityEvent } from "./generated";
const check = new Ajv({ strict: true }).compile(schema);
export function validateEvent(value: unknown): asserts value is CityEvent {
  if (JSON.stringify(value).length > 16384 || !check(value))
    throw Error("Invalid semantic event: " + JSON.stringify(check.errors));
  const e = value as CityEvent;
  if (e.type === "operation.started" && e.operation.outcome !== "unset")
    throw Error("Start cannot carry terminal outcome");
  if (e.type === "operation.finished" && e.operation.outcome === "unset")
    throw Error("Finish requires outcome");
  if (e.type === "operation.failed" && e.operation.outcome !== "failed")
    throw Error("Failure requires failed outcome");
}
