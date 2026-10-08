import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
// @ts-expect-error standalone installer JavaScript
import { managedLauncher } from "../installer/launcher.mjs";
test("managed setup uses private npm and preserves literal arguments in a spaced path", async () => {
  const root = await mkdtemp(join(tmpdir(), "city launcher "));
  try {
    await mkdir(join(root, ".node/bin"), { recursive: true });
    await mkdir(join(root, "agent-city"));
    await writeFile(join(root, "start.command"), managedLauncher, {
      mode: 0o755,
    });
    await writeFile(join(root, ".node/bin/node"), "#!/bin/sh\nexit 0\n", {
      mode: 0o755,
    });
    await writeFile(
      join(root, ".node/bin/npm"),
      `#!${process.execPath}\nconsole.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),launcher:process.env.CITY_MANAGED_LAUNCHER}));\n`,
      { mode: 0o755 },
    );
    const run = (...args: string[]) =>
      spawnSync("/bin/sh", [join(root, "start.command"), ...args], {
        env: { PATH: "/usr/bin:/bin" },
        encoding: "utf8",
      });
    const first = run();
    expect(first.status).toBe(0);
    expect(JSON.parse(first.stdout)).toEqual({
      args: ["start"],
      cwd: await realpath(join(root, "agent-city")),
      launcher: join(root, "start.command"),
    });
    const literal = "path with spaces; $(touch NEVER) `echo NEVER`";
    const setup = run("setup:workcell", "--build", literal);
    expect(setup.status).toBe(0);
    expect(JSON.parse(setup.stdout).args).toEqual([
      "run",
      "setup:workcell",
      "--",
      "--build",
      literal,
    ]);
    expect(run("doctor", "--json").status).toBe(0);
    expect(run("--help").stdout).toContain("provider:codex");
    expect(run("unrecognized").status).toBe(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
