import { test, expect } from "vitest";
import {
  mkdtemp,
  writeFile,
  readFile,
  stat,
  chmod,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  saveWorkcellSettings,
  workcellLaunchEnv,
} from "../apps/runner/workcell-settings";
import { admitWorkcell } from "../apps/runner/mission-workcell";
const settings = {
  schema: "agent-city.workcell-settings.v1" as const,
  enabled: true as const,
  imageId: "sha256:" + "a".repeat(64),
  dockerContext: "local-test",
};

test("saved operator setup survives restart without giving per-task consent or changing explicit environment", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-workcell-settings-"));
  try {
    await writeFile(
      join(dir, "workcell-image.json"),
      JSON.stringify({ imageId: settings.imageId }),
    );
    expect(await workcellLaunchEnv(dir, {})).toEqual({});
    await saveWorkcellSettings(dir, settings);
    const configured = await workcellLaunchEnv(dir, { PATH: "/usr/bin" });
    expect(configured).toEqual({
      PATH: "/usr/bin",
      CITY_ENABLE_WORKCELL: "1",
      CITY_WORKCELL_IMAGE: settings.imageId,
      DOCKER_CONTEXT: "local-test",
    });
    expect(admitWorkcell(undefined, "kujo", configured)).toBe(false);
    expect(admitWorkcell(true, "kujo", configured)).toBe(true);
    expect(await workcellLaunchEnv(dir, { CITY_ENABLE_WORKCELL: "0" })).toEqual(
      { CITY_ENABLE_WORKCELL: "0" },
    );
    expect(
      (await workcellLaunchEnv(dir, { DOCKER_HOST: "unix:///explicit.sock" }))
        .DOCKER_CONTEXT,
    ).toBeUndefined();
    expect(
      (await workcellLaunchEnv(dir, { DOCKER_CONTEXT: "explicit" }))
        .DOCKER_CONTEXT,
    ).toBe("explicit");
    expect((await stat(join(dir, "workcell-settings.json"))).mode & 0o777).toBe(
      0o600,
    );
    await saveWorkcellSettings(dir, {
      schema: settings.schema,
      enabled: false,
    });
    expect(await workcellLaunchEnv(dir, {})).toEqual({});
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("unsafe, corrupt or shared saved grants fail closed without modifying the previous setup", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-workcell-grants-"));
  const path = join(dir, "workcell-settings.json");
  try {
    await saveWorkcellSettings(dir, settings);
    const before = await readFile(path, "utf8");
    for (const bad of [
      { ...settings, imageId: "mutable:tag" },
      { ...settings, dockerContext: "a; echo bad" },
      { ...settings, token: "must-not-persist" },
    ])
      await expect(saveWorkcellSettings(dir, bad)).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(before);
    await chmod(path, 0o644);
    await expect(workcellLaunchEnv(dir, {})).rejects.toThrow("private");
    await rm(path);
    await writeFile(join(dir, "elsewhere"), before, { mode: 0o600 });
    await symlink(join(dir, "elsewhere"), path);
    await expect(workcellLaunchEnv(dir, {})).rejects.toThrow();
    await rm(path);
    await writeFile(path, "{corrupt", { mode: 0o600 });
    await expect(workcellLaunchEnv(dir, {})).rejects.toThrow();
    expect(await workcellLaunchEnv(dir, { CITY_ENABLE_WORKCELL: "0" })).toEqual(
      { CITY_ENABLE_WORKCELL: "0" },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
