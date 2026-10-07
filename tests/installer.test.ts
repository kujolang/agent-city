import { expect, test } from "vitest";
// Node-only installer intentionally has no application dependencies.
// @ts-expect-error standalone JS bootstrap
import { options, validateArchive, install } from "../installer/install.mjs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
