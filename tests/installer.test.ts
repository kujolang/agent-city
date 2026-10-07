import { expect, test } from "vitest";
// Node-only installer intentionally has no application dependencies.
// @ts-expect-error standalone JS bootstrap
import * as installer from "../installer/install.mjs";
const { options, validateArchive, validateSources, install } = installer;
import { mkdtemp, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
test("source lock rejects missing or substituted producers before installation", async () => {
  const lock = JSON.parse(
    await readFile(
      new URL("../installer/sources.json", import.meta.url),
      "utf8",
    ),
  );
  expect(() => validateSources(lock)).not.toThrow();
  const missing = structuredClone(lock);
  delete missing.repositories.workcell;
  expect(() => validateSources(missing)).toThrow("Invalid source lock");
  missing.repositories.unrelated = lock.repositories.workcell;
  expect(() => validateSources(missing)).toThrow("Invalid source lock");
  expect(() => validateSources({ ...lock, runtime: "latest" })).toThrow(
    "Invalid source lock",
  );
});
test("installer accepts explicit destination and no-start but rejects unknown switches", () => {
  expect(options(["--prefix", "/tmp/city with spaces", "--no-start"])).toEqual({
    prefix: "/tmp/city with spaces",
    start: false,
    action: "install",
  });
  expect(() => options(["--wipe"])).toThrow("Usage");
});
test("source archives reject traversal, multiple roots, links and special files", async () => {
  const check = (list: string, detail = "-rw-r--r-- file") =>
    validateArchive("test.tar.gz", async (_: string, args: string[]) =>
      args[0] === "-tzf" ? list : detail,
    );
  await expect(check("repo/file\nrepo/src/a")).resolves.toBeUndefined();
  await expect(check("repo/../../outside")).rejects.toThrow("Unsafe");
  await expect(check("/outside")).rejects.toThrow("Unsafe");
  await expect(check("repo/file\nother/file")).rejects.toThrow("one root");
  await expect(
    check("repo/link", "lrwxrwxrwx link -> /outside"),
  ).rejects.toThrow("links");
  await expect(check("repo/link", "hrwxrwxrwx link")).rejects.toThrow("links");
});
test("installer never overwrites an existing destination or its private state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-install-refuse-"));
  try {
    await writeFile(join(dir, "mission.txt"), "keep");
    await expect(install({ prefix: dir, start: false })).rejects.toThrow(
      "already exists",
    );
    expect(await readFile(join(dir, "mission.txt"), "utf8")).toBe("keep");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("installer invoked through a symlink still runs its entry point", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-entry-alias-"));
  try {
    const alias = join(dir, "source-alias");
    await symlink(resolve(import.meta.dirname, ".."), alias, "dir");
    const result = spawnSync(
      process.execPath,
      [join(alias, "installer/install.mjs"), "--prefix", dir, "--no-start"],
      { encoding: "utf8", timeout: 10000 },
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("already exists");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
