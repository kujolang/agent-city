import { readFile, writeFile, open } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  path = resolve(root, ".runtime/pids.json"),
  pids = JSON.parse(await readFile(path, "utf8"));
for (const name of ["bridge", "gateway"]) {
  try {
    process.kill(pids[name], "SIGTERM");
  } catch {}
  const log = await open(resolve(root, `.runtime/${name}-restarted.log`), "w");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      name === "bridge"
        ? "integrations/kujo/bridge.ts"
        : "apps/gateway/main.ts",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        KUJO_BIN:
          process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
      },
      stdio: ["ignore", log.fd, log.fd],
      detached: true,
    },
  );
  await log.close();
  child.unref();
  pids[name] = child.pid;
}
await writeFile(path, JSON.stringify(pids));
