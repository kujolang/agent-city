import { videoopsLaunchEnv } from "../apps/runner/videoops-settings";
import { workcellLaunchEnv } from "../apps/runner/workcell-settings";
import { localPorts, localRuntime } from "./local-ports";
import { prepareMcpProof as prepareLocalMcp } from "./prepare-mcp-proof";
import { startupChecks, formatStartupChecks } from "./startup-checks";
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, open, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  runtime = localRuntime(root);
const startup = await startupChecks(root);
if (!startup.ok) {
  console.error(formatStartupChecks(startup));
  process.exit(1);
}
const ports = localPorts();
const gatewayPort = ports.gateway,
  controlPort = ports.control;

await mkdir(runtime, { recursive: true });
let mcpToken = process.env.CITY_MCP_TOKEN;
if (!mcpToken) {
  try {
    mcpToken = await readFile(resolve(runtime, "mcp-token"), "utf8");
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
    mcpToken = randomBytes(32).toString("hex");
    await writeFile(resolve(runtime, "mcp-token"), mcpToken, { mode: 0o600 });
  }
}
const kujo = startup.kujo;
await stat(kujo);
let token;
try {
  token = await readFile(resolve(runtime, "token"), "utf8");
} catch {
  token = randomBytes(32).toString("hex");
  await writeFile(resolve(runtime, "token"), token, { mode: 0o600 });
}
const common = {
  ...(await videoopsLaunchEnv(runtime, await workcellLaunchEnv(runtime))),
  KUJO_BIN: kujo,
  CITY_RUNTIME_DIR: runtime,
  CITY_CONTROL_DIR: resolve(runtime, "control"),
  CITY_MISSIONS_DIR: resolve(runtime, "missions"),
  CITY_SOURCE_PREFIX: process.env.CITY_SOURCE_PREFIX || "review-",
  CITY_GATEWAY_URL: `http://127.0.0.1:${gatewayPort}`,
  CITY_CONTROL_URL: `http://127.0.0.1:${controlPort}`,
  CITY_PORT: String(ports.gateway),
  CITY_CONTROL_PORT: String(ports.control),
  CITY_WEB_PORT: String(ports.web),
  CITY_WEB_ORIGIN: `http://127.0.0.1:${ports.web}`,
  RAG_URL: `http://127.0.0.1:${ports.rag}`,
  WATCHDOG_URL: `http://127.0.0.1:${ports.watchdog}`,
  CITY_MCP_URL: `http://127.0.0.1:${ports.mcp}/mcp/v1`,
  CITY_MCP_TOKEN: mcpToken,
};
const children: ReturnType<typeof spawn>[] = [];
const pids: Record<string, number> = {};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
async function launch(
  name: string,
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
) {
  const log = await open(resolve(runtime, name + ".log"), "w");
  const child = spawn(command, args, {
    cwd,
    env: { ...common, ...env },
    stdio: ["ignore", log.fd, log.fd],
  });
  await log.close();
  children.push(child);
  pids[name] = child.pid!;
  child.on("error", (e) => console.error(name, e.message));
  return child;
}
async function ready(url: string, headers: HeadersInit = {}) {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(500), headers });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Service failed: " + url);
}
try {
  await launch(
    "rag",
    kujo,
    [
      "run",
      "main.kujo",
      "--interpreter",
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      String(ports.rag),
    ],
    resolve(root, "../rag"),
    { KUJO_RAG_INDEX_PATH: resolve(runtime, "rag.json") },
  );
  await launch(
    "watchdog",
    kujo,
    ["run", "dashboard_server.kujo", "--interpreter"],
    resolve(root, "../watchdog"),
    {
      WDG_PORT: String(ports.watchdog),
      WDG_HOST: "127.0.0.1",
      WDG_DB_PATH: resolve(runtime, "watchdog.db"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: randomBytes(32).toString("hex"),
      WDG_BACKUP_ENABLED: "false",
    },
  );
  const existingMcp = await fetch(
    `http://127.0.0.1:${ports.mcp}/mcp/v1/health`,
    {
      signal: AbortSignal.timeout(1500),
    },
  )
    .then((r) => r.ok)
    .catch(() => false);
  if (!existingMcp) {
    const mcpRoot = await prepareLocalMcp(
      resolve(runtime, "mcp"),
      ports.mcp,
      mcpToken,
    );
    await launch("mcp", kujo, ["run", "server.kujo", "--interpreter"], mcpRoot);
  }
  await ready(`http://127.0.0.1:${ports.mcp}/mcp/v1/health`, {
    authorization: `Bearer ${mcpToken}`,
  });
  await ready(`http://127.0.0.1:${ports.rag}/health`);
  await ready(`http://127.0.0.1:${ports.watchdog}/readyz`);
  await launch(
    "gateway",
    process.execPath,
    ["--import", "tsx", "apps/gateway/main.ts"],
    root,
    { CITY_DB: process.env.CITY_DB || resolve(runtime, "review.sqlite") },
  );
  await launch(
    "bridge",
    process.execPath,
    ["--import", "tsx", "integrations/kujo/bridge.ts"],
    root,
  );
  await launch(
    "runner",
    process.execPath,
    ["--import", "tsx", "apps/runner/main.ts"],
    root,
  );
  await launch(
    "web",
    process.execPath,
    ["node_modules/vite/bin/vite.js", "apps/web", "--host", "127.0.0.1"],
    root,
  );
  await ready(`http://127.0.0.1:${gatewayPort}/api/world/snapshot`);
  await ready(`http://127.0.0.1:${controlPort}/control/status`);
  await ready(`http://127.0.0.1:${ports.web}`);
  await writeFile(resolve(runtime, "pids.json"), JSON.stringify(pids));
  console.log(
    `Agent City ready: http://127.0.0.1:${ports.web} — use Mission Command for writing/code tasks; Follow observes actual executions.`,
  );
} catch (e) {
  console.error(e);
  for (const c of children) c.kill("SIGKILL");
  process.exit(1);
}
function stop() {
  for (const c of children) c.kill("SIGTERM");
  setTimeout(() => {
    for (const c of children) c.kill("SIGKILL");
    process.exit(0);
  }, 300);
}

await new Promise(() => {});
