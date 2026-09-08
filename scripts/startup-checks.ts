import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { createServer } from "node:net";
import { delimiter, isAbsolute, resolve } from "node:path";

export type StartupCheck = {
  id: string;
  status: "PASS" | "FAIL" | "INFO";
  message: string;
};
export async function resolveExecutable(
  value: string,
  root: string,
  path = process.env.PATH || "",
) {
  const candidates =
    isAbsolute(value) || value.includes("/")
      ? [resolve(root, value)]
      : path
          .split(delimiter)
          .filter(Boolean)
          .map((dir) => resolve(dir, value));
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  throw Error(
    "Kujo executable unavailable. Build ../kujo/target/release/kujo or set KUJO_BIN to an executable path.",
  );
}
/** Bind without sending traffic to an unknown process. Never stops existing services. */
export async function portAvailable(port: number): Promise<boolean> {
  return await new Promise((ok, fail) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) =>
      error.code === "EADDRINUSE" ? ok(false) : fail(error),
    );
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () =>
      server.close((error) => (error ? fail(error) : ok(true))),
    );
  });
}
export async function startupChecks(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
  nodeVersion = process.versions.node,
  inspectPorts = true,
) {
  const checks: StartupCheck[] = [];
  checks.push({
    id: "node",
    status: Number(nodeVersion.split(".")[0]) >= 24 ? "PASS" : "FAIL",
    message: `Node ${nodeVersion}; Node 24 or newer is required.`,
  });
  let kujo = "";
  try {
    kujo = await resolveExecutable(
      env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
      root,
      env.PATH,
    );
    checks.push({ id: "kujo", status: "PASS", message: kujo });
  } catch (e) {
    checks.push({ id: "kujo", status: "FAIL", message: (e as Error).message });
  }
  const required = [
    "node_modules/tsx/package.json",
    "node_modules/vite/package.json",
    "node_modules/pixi.js/package.json",
    "../agents-sdk/src/agents/runner.kujo",
    "../agents-sdk/src/agents/tracing/lifecycle.kujo",
    "../dispatch/src/core/runner.kujo",
    "../watchdog/dashboard_server.kujo",
    "../rag/main.kujo",
    "../rag/examples/kujo_docs",
    "../eval/main.kujo",
    "../mcp/server.kujo",
  ];
  for (const path of required) {
    try {
      await access(resolve(root, path), constants.R_OK);
      checks.push({ id: path, status: "PASS", message: path });
    } catch {
      checks.push({
        id: path,
        status: "FAIL",
        message: `Missing/unreadable ${path}. ${path.startsWith("node_modules") ? "Run npm ci in Agent City." : "Restore the matching sibling Kujo repository checkout."}`,
      });
    }
  }
  const seenPorts = new Map<number, string>();
  if (inspectPorts)
    for (const [name, raw] of [
      ["web", "5178"],
      ["RAG", "8791"],
      ["Watchdog", "7791"],
      ["gateway", env.CITY_PORT || "7792"],
      ["mission service", env.CITY_CONTROL_PORT || "7793"],
      ["MCP", "8931"],
    ]) {
      const port = Number(raw);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        checks.push({
          id: name,
          status: "FAIL",
          message: `Invalid ${name} port: ${raw}`,
        });
        continue;
      }
      if (seenPorts.has(port)) {
        checks.push({
          id: name,
          status: "FAIL",
          message: `${name} and ${seenPorts.get(port)} both use port ${port}. Choose distinct service ports.`,
        });
        continue;
      }
      seenPorts.set(port, name);
      try {
        if (await portAvailable(port)) {
          checks.push({
            id: name,
            status: "PASS",
            message: `${name}: port ${port} available`,
          });
          continue;
        }
        // Existing local MCP reuse is the launcher's documented behavior; no model call.
        if (
          name === "MCP" &&
          (await fetch(`http://127.0.0.1:${port}/mcp/v1/health`, {
            signal: AbortSignal.timeout(1500),
          })
            .then((r) => r.ok)
            .catch(() => false))
        ) {
          checks.push({
            id: name,
            status: "INFO",
            message:
              "Existing local MCP health endpoint responds; launcher will reuse it. Tool authorization is checked when explicitly invoked.",
          });
          continue;
        }
        checks.push({
          id: name,
          status: "FAIL",
          message: `${name}: port ${port} is occupied. Stop its owning service yourself or the previous Agent City launcher with Ctrl+C; no process was stopped.`,
        });
      } catch (e) {
        checks.push({
          id: name,
          status: "FAIL",
          message: `Cannot check ${name} port ${port}: ${(e as Error).message}`,
        });
      }
    }
  checks.push({
    id: "model",
    status: "INFO",
    message:
      "Configure the model in Mission Command. This check does not contact a provider or execute a task.",
  });
  return { ok: !checks.some((c) => c.status === "FAIL"), kujo, checks };
}
export function formatStartupChecks(
  result: Awaited<ReturnType<typeof startupChecks>>,
) {
  return result.checks.map((c) => `${c.status} ${c.message}`).join("\n");
}
