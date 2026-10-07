import { expect, test } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  lstat,
  symlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
// @ts-expect-error dependency-free bootstrap module
import { maintain, acquireLease } from "../installer/lifecycle.mjs";

async function fixture() {
  const base = await mkdtemp(join(tmpdir(), "city-maintenance-"));
  const prefix = join(base, "city with spaces");
  await seed(prefix, "old");
  await mkdir(join(prefix, "agent-city/.runtime/control"), { recursive: true });
  await writeFile(
    join(prefix, "agent-city/.runtime/control/model.json"),
    "private-config",
    { mode: 0o600 },
  );
  await writeFile(
    join(prefix, "agent-city/.runtime/mission.json"),
    JSON.stringify({
      evidence: join(prefix, "agent-city/.runtime/draft.kujo"),
    }),
  );
  return {
    base,
    prefix,
    cleanup: () => rm(base, { recursive: true, force: true }),
  };
}
async function seed(prefix: string, version: string) {
  await mkdir(join(prefix, "agent-city"), { recursive: true });
  await writeFile(
    join(prefix, "install-receipt.json"),
    JSON.stringify({ schema: "agent-city.install.v1", cityRevision: version }),
  );
  await writeFile(join(prefix, "agent-city/version"), version);
}
test("cold update preserves private configuration, evidence paths and complete rollback archive", async () => {
  const f = await fixture();
  try {
    const result = await maintain({
      prefix: f.prefix,
      action: "update",
      prepare: (next: string) => seed(next, "new"),
    });
    expect(await readFile(join(f.prefix, "agent-city/version"), "utf8")).toBe(
      "new",
    );
    expect(
      await readFile(join(result.backup, "agent-city/version"), "utf8"),
    ).toBe("old");
    for (const root of [f.prefix, result.backup]) {
      expect(
        await readFile(
          join(root, "agent-city/.runtime/control/model.json"),
          "utf8",
        ),
      ).toBe("private-config");
      expect(
        JSON.parse(
          await readFile(
            join(root, "agent-city/.runtime/mission.json"),
            "utf8",
          ),
        ).evidence,
      ).toBe(join(f.prefix, "agent-city/.runtime/draft.kujo"));
    }
    expect(
      (await lstat(join(f.prefix, "agent-city/.runtime/control/model.json")))
        .mode & 0o777,
    ).toBe(0o600);
  } finally {
    await f.cleanup();
  }
});
test("failed update preparation leaves original install untouched and releases maintenance lock", async () => {
  const f = await fixture();
  try {
    await expect(
      maintain({
        prefix: f.prefix,
        action: "update",
        prepare: async (next: string) => {
          await seed(next, "partial");
          throw Error("download failed");
        },
      }),
    ).rejects.toThrow("download failed");
    expect(await readFile(join(f.prefix, "agent-city/version"), "utf8")).toBe(
      "old",
    );
    const release = await acquireLease(f.prefix);
    await release();
  } finally {
    await f.cleanup();
  }
});
test("uninstall archives all data and refuses active startup or recorded live services", async () => {
  const f = await fixture();
  try {
    const release = await acquireLease(f.prefix);
    await expect(
      maintain({ prefix: f.prefix, action: "uninstall" }),
    ).rejects.toThrow("running");
    await release();
    await writeFile(
      join(f.prefix, "agent-city/.runtime/pids.json"),
      JSON.stringify({ service: process.pid }),
    );
    await expect(
      maintain({ prefix: f.prefix, action: "uninstall" }),
    ).rejects.toThrow("still alive");
    await rm(join(f.prefix, "agent-city/.runtime/pids.json"));
    const result = await maintain({ prefix: f.prefix, action: "uninstall" });
    await expect(lstat(f.prefix)).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await readFile(
        join(result.backup, "agent-city/.runtime/control/model.json"),
        "utf8",
      ),
    ).toBe("private-config");
  } finally {
    await f.cleanup();
  }
});
test("maintenance rejects symlinked installation roots", async () => {
  const f = await fixture();
  try {
    await symlink(f.prefix, join(f.base, "alias"));
    await expect(
      maintain({ prefix: join(f.base, "alias"), action: "uninstall" }),
    ).rejects.toThrow("real directory");
  } finally {
    await f.cleanup();
  }
});
