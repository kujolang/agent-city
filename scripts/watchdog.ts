import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
let token;
try {
  token = await readFile(resolve(root, ".runtime/token"), "utf8");
} catch {
  token = randomBytes(32).toString("hex");
  await writeFile(resolve(root, ".runtime/token"), token, { mode: 0o600 });
}
const p = spawn(
  process.env.KUJO_BIN || "kujo",
  ["run", "dashboard_server.kujo", "--interpreter"],
  {
    cwd: resolve(root, "../watchdog"),
    env: {
      ...process.env,
      WDG_PORT: "7791",
      WDG_DB_PATH: resolve(root, ".runtime/watchdog.db"),
      WDG_API_AUTH_MODE: "token",
      WDG_API_AUTH_TOKEN: token,
      WDG_PROXY_AUTHZ_MODE: "token",
      WDG_PROXY_AUTHZ_TOKEN: token,
    },
    stdio: "inherit",
  },
);
p.on("exit", (code) => process.exit(code || 0));
