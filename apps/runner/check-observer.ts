import { appendFile, stat, writeFile } from "node:fs/promises";

/** Metadata-only, bounded, fail-open observation for the local check runner. */
export function checkObserver(
  file: string,
  producer: string,
  run: string,
  task: string,
  identity = {
    profile: "city-function-checker",
    agent: "function-checker",
    tool: "city.function-check",
  },
) {
  return async (
    operation: string,
    kind: "execution" | "evaluation",
    phase: "started" | "finished",
    outcome: string,
    occurredAt = Date.now(),
  ) => {
    try {
      if ((await stat(file)).size > 250000) throw Error("observation quota");
      await appendFile(
        file,
        JSON.stringify({
          schema: "kujo.lifecycle.v1",
          producer_instance: producer,
          profile: identity.profile,
          run_id: run,
          agent_id: identity.agent,
          task_id: task,
          operation_id: operation,
          attempt: 1,
          kind,
          phase,
          outcome,
          occurred_at_ms: occurredAt,
          metadata: { tool: identity.tool },
        }) + "\n",
      );
    } catch {
      try {
        await writeFile(
          file + ".gap",
          "function-check observation incomplete",
          { mode: 0o600 },
        );
      } catch {}
    }
  };
}
