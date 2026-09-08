import { resolve } from "node:path";
/** One offset keeps a complete local stack together without touching other listeners. */
export function localPorts(env: NodeJS.ProcessEnv = process.env) {
  const offset = Number(env.CITY_PORT_OFFSET || 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 56604)
    throw Error("CITY_PORT_OFFSET must be an integer from 0 to 56604");
  return {
    web: 5178 + offset,
    rag: 8791 + offset,
    watchdog: 7791 + offset,
    gateway: Number(env.CITY_PORT || 7792 + offset),
    control: Number(env.CITY_CONTROL_PORT || 7793 + offset),
    mcp: 8931 + offset,
  };
}

export function localRuntime(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const offset = Number(env.CITY_PORT_OFFSET || 0);
  localPorts(env); // Validate before deriving a filesystem location.
  return resolve(
    root,
    env.CITY_RUNTIME_DIR ||
      (offset ? `.runtime/instances/${offset}` : ".runtime"),
  );
}
