/** Destructive-path checks only against an explicitly supplied, owned test installation.
 * Uninstall archives and restores it; archives are deliberately retained.
 */
import assert from "node:assert/strict";
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  lstat,
  rename,
  realpath,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { install } from "../installer/install.mjs";
import {
  maintain,
  acquireLease,
  managedReceipt,
} from "../installer/lifecycle.mjs";
const prefix = process.env.CITY_OWNED_TEST_INSTALL;
const output = process.env.CITY_MAINTENANCE_PROOF;
if (!prefix || !output)
  throw Error(
    "Explicit CITY_OWNED_TEST_INSTALL and CITY_MAINTENANCE_PROOF required",
  );
const root = await realpath(prefix);
await managedReceipt(root);
const runtime = join(root, "agent-city/.runtime");
await mkdir(join(runtime, "maintenance-proof"), { recursive: true });
await writeFile(
  join(runtime, "maintenance-proof/canary.bin"),
  Buffer.from([0, 255, 42, 13, 10]),
);
async function hashes(dir, rel = "") {
  const values = {};
  for (const entry of await readdir(join(dir, rel), { withFileTypes: true })) {
    const file = join(rel, entry.name);
    if (entry.isSymbolicLink()) throw Error("Test refuses runtime symlinks");
    if (entry.isDirectory()) Object.assign(values, await hashes(dir, file));
    else if (entry.isFile())
      values[file] = createHash("sha256")
        .update(await readFile(join(dir, file)))
        .digest("hex");
    else throw Error("Test refuses special runtime files");
  }
  return values;
}
const result = {
  schema: "agent-city.installed-maintenance-proof.v1",
  platform: process.platform,
  arch: process.arch,
  startedAt: new Date().toISOString(),
  checks: [],
};
const before = await hashes(runtime);
const hadPrivateNode = await lstat(join(root, ".node/bin/node"))
  .then((info) => info.isFile())
  .catch((e) => {
    if (e.code !== "ENOENT") throw e;
    return false;
  });
try {
  await assert.rejects(
    install({ prefix: root, start: false }),
    /already exists/,
  );
  result.checks.push("repeat install refuses existing destination");
  const release = await acquireLease(root);
  try {
    await assert.rejects(
      maintain({ prefix: root, action: "uninstall" }),
      /running or maintenance/,
    );
  } finally {
    await release();
  }
  result.checks.push("active lease prevents maintenance");
  await assert.rejects(
    maintain({
      prefix: root,
      action: "update",
      prepare: async () => {
        throw Error("controlled preparation failure");
      },
    }),
    /controlled preparation failure/,
  );
  assert.deepEqual(await hashes(runtime), before);
  result.checks.push("failed preparation preserves original runtime");
  const updated = await maintain({
    prefix: root,
    action: "update",
    prepare: (next) => install({ prefix: next, start: false }),
  });
  assert.deepEqual(await hashes(runtime), before);
  assert.deepEqual(
    await hashes(join(updated.backup, "agent-city/.runtime")),
    before,
  );
  await managedReceipt(root);
  result.checks.push(
    "real pinned update preserves all runtime bytes at original path and in archive",
  );
  const privateNode = join(root, ".node/bin/node");
  try {
    assert((await lstat(privateNode)).isFile());
    result.privateNodeRetained = true;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    result.privateNodeRetained = false;
  }
  if (hadPrivateNode)
    assert.equal(result.privateNodeRetained, true, "update lost private Node");
  const uninstalled = await maintain({ prefix: root, action: "uninstall" });
  await assert.rejects(lstat(root), { code: "ENOENT" });
  assert.deepEqual(
    await hashes(join(uninstalled.backup, "agent-city/.runtime")),
    before,
  );
  await rename(uninstalled.backup, root);
  assert.deepEqual(await hashes(runtime), before);
  result.checks.push(
    "archive uninstall preserves all runtime bytes and can restore original path",
  );
  result.runtimeFiles = Object.keys(before).length;
  result.status = "PASS";
} catch (error) {
  result.status = "FAIL";
  result.error = String(error);
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  await writeFile(resolve(output), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
}
