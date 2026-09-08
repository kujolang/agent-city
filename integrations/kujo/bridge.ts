import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const root = resolve(import.meta.dirname, "../.."),
  runtime = resolve(root, ".runtime");
const watchdog = resolve(root, "../watchdog"),
  kujo = process.env.KUJO_BIN || "kujo";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function bridgeOnce() {
  await mkdir(resolve(runtime, "batches"), { recursive: true });
  const files = await readdir(resolve(runtime, "batches"));
  if (files.length > 4096)
    throw Error(
      "bridge session quota reached; retain evidence and start a new explicit session",
    );
  for (const name of (await readdir(runtime))
    .filter((n) => /^spool-.*\.jsonl$/.test(n))
    .sort()) {
    const path = resolve(runtime, name);
    if ((await stat(path)).size > 262144) throw Error("spool overflow");
    const lines = (await readFile(path, "utf8")).split("\n").slice(0, -1);
    try {
      await stat(path + ".gap");
      if (lines.length) {
        const first = JSON.parse(lines[0]);
        lines.push(
          JSON.stringify({
            ...first,
            kind: "internal",
            operation_id: "coverage",
            phase: "gap",
            outcome: "unknown",
          }),
        );
      }
    } catch {}
    for (const line of lines) {
      const e = JSON.parse(line);
      if (e.schema !== "kujo.lifecycle.v1")
        throw Error("unsupported lifecycle");
      const id = [
        e.producer_instance,
        e.run_id,
        e.agent_id,
        e.operation_id,
        e.attempt,
        e.phase,
      ].join(":");
      const key = hash(id),
        file = resolve(runtime, "batches", key + ".json");
      try {
        await stat(file + ".sent");
        continue;
      } catch {}
      let body: string;
      try {
        body = await readFile(file, "utf8");
      } catch {
        const native = {
          schema_version: "watchdog.native-event.v1",
          event_id: key,
          event_kind: e.kind,
          instantaneous: true,
          trace_id: e.producer_instance + ":" + e.run_id,
          name: e.kind + "." + e.phase,
          status:
            e.phase === "started"
              ? "unset"
              : e.outcome === "succeeded"
                ? "ok"
                : "error",
          started_at_ms: e.occurred_at_ms,
          references: [
            {
              type: "agent",
              namespace: e.producer_instance,
              id: e.agent_id,
              relation: "actor",
            },
            {
              type: "run",
              namespace: e.producer_instance,
              id: e.run_id,
              relation: "groups",
            },
            {
              type: "task",
              namespace: e.task_id
                ? e.profile === "local-eval-invocation"
                  ? "eval"
                  : "dispatch"
                : "unknown",
              id: e.task_id || "unknown",
              relation: "groups",
            },
          ],
          attributes: {
            "kujo.lifecycle.phase": e.phase,
            "kujo.operation.id": e.operation_id,
            "kujo.operation.attempt": e.attempt,
            "kujo.producer.instance": e.producer_instance,
            "kujo.source.occurred_at_ms": e.occurred_at_ms,
            "kujo.capability":
              e.kind === "retrieval"
                ? "rag.query"
                : e.kind === "agent"
                  ? "agent.run"
                  : e.kind === "handoff"
                    ? "agent.handoff"
                    : e.kind === "evaluation"
                      ? "evaluation.run"
                      : e.kind === "execution"
                        ? "execution.run"
                        : "tool.execute",
            "kujo.lifecycle.outcome": e.outcome,
            "kujo.workspace.id": "local-agent-city",
            "kujo.collection.id":
              e.kind === "retrieval" ? "kujo-docs" : "unknown",
            "kujo.lifecycle.coverage": "paired",
            "kujo.related.agent": e.related_agent_id || "",
            "kujo.profile.id": e.profile || "local-documentation-worker",
            "kujo.task.binding": e.task_id ? "explicit" : "unknown",
          },
        };
        await writeFile(
          file + ".native",
          JSON.stringify({ batch_id: key, events: [native] }),
        );
        await new Promise<void>((ok, fail) => {
          const p = spawn(
            kujo,
            [
              "run",
              resolve(root, "integrations/kujo/normalize.kujo"),
              "--interpreter",
            ],
            {
              cwd: watchdog,
              env: {
                ...process.env,
                CITY_NATIVE_INPUT: file + ".native",
                CITY_CANONICAL_OUTPUT: file,
              },
              stdio: "ignore",
            },
          );
          p.on("error", fail);
          p.on("exit", (code) =>
            code === 0 ? ok() : fail(Error("native adapter failed " + code)),
          );
        });
        body = await readFile(file, "utf8");
      }
      const res = await fetch(
        (process.env.WATCHDOG_URL || "http://127.0.0.1:7791") +
          "/telemetry/v2/batches",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization:
              "Bearer " +
              (process.env.WDG_API_AUTH_TOKEN ||
                (await readFile(resolve(runtime, "token"), "utf8"))),
          },
          body,
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!res.ok)
        throw Error(
          "canonical intake " + res.status + ": " + (await res.text()),
        );
      await writeFile(file + ".sent", hash(body));
    }
  }
}
if (process.argv[1] === import.meta.filename) {
  for (;;) {
    try {
      await bridgeOnce();
    } catch (e) {
      console.error(String(e));
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}
