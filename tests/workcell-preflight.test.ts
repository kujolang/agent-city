import { test, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertWorkcellAvailable } from "../apps/runner/workcell-preflight";
import type { boundedCommand } from "../apps/runner/bounded-command";

test("preflight checks only engine and local image, preserving context and hiding diagnostics", async () => {
  const base = await mkdtemp(join(tmpdir(), "city-preflight-"));
  const root = join(base, "city");
  try {
    await mkdir(root);
    await mkdir(join(base, "workcell/bin"), { recursive: true });
    await writeFile(join(base, "workcell/bin/workcell"), "#!/bin/sh\n", {
      mode: 0o755,
    });
    await writeFile(
      join(base, "workcell/workcell.json"),
      JSON.stringify({ runtime: { backend: "docker" } }),
    );
    const env = {
      CITY_WORKCELL_IMAGE: "trusted:local",
      DOCKER_CONTEXT: "operator-selected",
    };
    const calls: any[] = [];
    const success: typeof boundedCommand = async (...args) => {
      calls.push(args);
      return { code: 0, timedOut: false, output: "sha256:local" };
    };
    await assertWorkcellAvailable(root, env, success);
    expect(calls.map(([cmd, args]) => [cmd, args])).toEqual([
      ["docker", ["info", "--format", "{{json .}}"]],
      ["docker", ["image", "inspect", "--format", "{{.Id}}", "trusted:local"]],
    ]);
    expect(
      calls.every((c) => c[2].env === env && c[2].timeoutMs === 5000),
    ).toBe(true);
    calls.length = 0;
    const unavailable: typeof boundedCommand = async (...args) => {
      calls.push(args);
      return { code: 1, timedOut: false, output: "private daemon details" };
    };
    await expect(
      assertWorkcellAvailable(root, env, unavailable),
    ).rejects.toThrow("No mission was started");
    expect(calls).toHaveLength(1);
    let count = 0;
    const missingImage: typeof boundedCommand = async () => ({
      code: ++count === 1 ? 0 : 1,
      timedOut: false,
      output: "private daemon details",
    });
    await expect(
      assertWorkcellAvailable(root, env, missingImage),
    ).rejects.toThrow("did not pull or execute");
    await expect(
      assertWorkcellAvailable(
        root,
        { ...env, CITY_WORKCELL_IMAGE: "--help" },
        success,
      ),
    ).rejects.toThrow("Select a trusted");
    await expect(
      assertWorkcellAvailable(root, env, async () => ({
        code: 0,
        timedOut: true,
        output: "",
      })),
    ).rejects.toThrow("unavailable");
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
