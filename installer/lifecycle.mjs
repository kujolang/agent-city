import { copyPrivateNode } from "./private-node.mjs";
import {
  mkdir,
  readFile,
  writeFile,
  lstat,
  readdir,
  realpath,
  cp,
  rename,
  rm,
} from "node:fs/promises";
import { resolve, dirname, basename, join } from "node:path";
import { randomUUID } from "node:crypto";

export async function managedReceipt(prefix) {
  const root = await lstat(prefix);
  if (!root.isDirectory() || root.isSymbolicLink())
    throw Error("Managed installation must be a real directory");
  const receipt = JSON.parse(
    await readFile(join(prefix, "install-receipt.json"), "utf8"),
  );
  if (receipt.schema !== "agent-city.install.v1")
    throw Error("Not an Agent City managed installation");
  return receipt;
}

// Shared by npm start and maintenance. Never steal a stale lock: descendants may
// still be writing even after the owning launcher has exited abnormally.
export async function acquireLease(prefix) {
  prefix = await realpath(prefix);
  const lock = join(dirname(prefix), `.${basename(prefix)}.city-lock`);
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === "EEXIST")
      throw Error(
        `Agent City is running or maintenance is pending. Stop it first. If it crashed, verify all its processes stopped before removing ${lock}`,
      );
    throw error;
  }
  try {
    await writeFile(
      join(lock, "owner.json"),
      JSON.stringify({
        pid: process.pid,
        prefix,
        acquiredAt: new Date().toISOString(),
      }),
      { mode: 0o600 },
    );
  } catch (error) {
    await rm(lock, { recursive: true, force: true });
    throw error;
  }
  return async () => {
    await rm(lock, { recursive: true, force: true });
  };
}

async function assertStopped(prefix) {
  const runtime = join(prefix, "agent-city/.runtime");
  const dirs = [runtime];
  try {
    for (const entry of await readdir(join(runtime, "instances"), {
      withFileTypes: true,
    }))
      if (entry.isDirectory())
        dirs.push(join(runtime, "instances", entry.name));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const dir of dirs) {
    let pids;
    try {
      pids = JSON.parse(await readFile(join(dir, "pids.json"), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const pid of Object.values(pids)) {
      if (!Number.isInteger(pid) || pid <= 0)
        throw Error("Invalid process receipt; cannot establish stopped state");
      try {
        process.kill(pid, 0);
      } catch (error) {
        if (error.code === "ESRCH") continue;
        throw error;
      }
      throw Error(
        `Recorded Agent City process ${pid} is still alive; maintenance refused`,
      );
    }
  }
}

export async function maintain({ prefix, action, prepare }) {
  prefix = resolve(prefix);
  if (!["update", "uninstall"].includes(action))
    throw Error("Unknown maintenance action");
  await managedReceipt(prefix);
  const release = await acquireLease(prefix);
  const suffix = randomUUID();
  const backup = `${prefix}.archive-${suffix}`;
  const next = `${prefix}.update-${suffix}`;
  try {
    await assertStopped(prefix);
    if (action === "update") {
      if (!prepare) throw Error("Update requires a prepared source installer");
      await prepare(next);
      await managedReceipt(next);
      // Keep the same final path: historical absolute evidence references remain valid.
      // Cold-copy all local state, including SQLite sidecars and provider configuration.
      const runtime = join(prefix, "agent-city/.runtime");
      let info;
      try {
        info = await lstat(runtime);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      if (info) {
        if (!info.isDirectory() || info.isSymbolicLink())
          throw Error(
            "External runtime symlink cannot be migrated automatically",
          );
        await cp(runtime, join(next, "agent-city/.runtime"), {
          recursive: true,
          errorOnExist: true,
          force: false,
        });
      }
      // A system Node install updating a private-Node install must retain its runtime.
      try {
        await lstat(join(next, ".node"));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        let previousNode;
        try {
          previousNode = await lstat(join(prefix, ".node"));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        if (previousNode) {
          if (!previousNode.isDirectory() || previousNode.isSymbolicLink())
            throw Error("Managed Node must be a real directory");
          await copyPrivateNode(join(prefix, ".node"), join(next, ".node"));
        }
      }
      await assertStopped(prefix);
    }
    await rename(prefix, backup);
    if (action === "update") {
      try {
        await rename(next, prefix);
      } catch (error) {
        await rename(backup, prefix);
        throw error;
      }
    }
    return { action, prefix, backup, retainedData: true };
  } finally {
    // Backup is deliberately never deleted, including on an activation failure.
    await rm(next, { recursive: true, force: true });
    await release();
  }
}
