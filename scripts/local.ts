import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, open, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  runtime = resolve(root, ".runtime");
await mkdir(runtime, { recursive: true });
const kujo =
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo");
await stat(kujo);
let token;
try {
  token = await readFile(resolve(runtime, "token"), "utf8");
} catch {
  token = randomBytes(32).toString("hex");
  await writeFile(resolve(runtime, "token"), token, { mode: 0o600 });
}
const common = {
  ...process.env,
  KUJO_BIN: kujo,
  CITY_SOURCE_PREFIX: process.env.CITY_SOURCE_PREFIX || "review-",
};
const children: ReturnType<typeof spawn>[] = [];
const pids: Record<string, number> = {};
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
async function ready(url: string) {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(500) });
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
      "8791",
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
      WDG_PORT: "7791",
      WDG_DB_PATH: resolve(runtime, "watchdog.db"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: token,
      WDG_BACKUP_ENABLED: "false",
    },
  );
  const existingMcp = await fetch("http://127.0.0.1:8931/mcp/v1/health")
    .then((r) => r.ok)
    .catch(() => false);
  if (!existingMcp)
    await launch(
      "mcp",
      kujo,
      ["run", "server.kujo", "--interpreter"],
      resolve(root, "../mcp"),
    );
  await ready("http://127.0.0.1:8931/mcp/v1/health");
  await ready("http://127.0.0.1:8791/health");
  await ready("http://127.0.0.1:7791/readyz");
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
    "web",
    process.execPath,
    ["node_modules/vite/bin/vite.js", "apps/web", "--host", "127.0.0.1"],
    root,
  );
  await ready("http://127.0.0.1:7792/api/world/snapshot");
  await ready("http://127.0.0.1:5178");
  await writeFile(resolve(runtime, "pids.json"), JSON.stringify(pids));
  console.log(
    "Observer ready: http://127.0.0.1:5178 (read-only; run npm run proof separately for real work)",
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
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await new Promise(() => {});
