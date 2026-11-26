import { test, expect } from "vitest";
import {
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  chmod,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  saveVideoopsSettings,
  videoopsLaunchEnv,
} from "../apps/runner/videoops-settings";
import {
  readVideoopsLaunchConfig,
  videoopsRuntimeLockSha256,
} from "../apps/runner/videoops-mission";
const hash = createHash("sha256").update("fixture").digest("hex");
const profile = (stage: string): any => ({
  id: "kujolang/kujo-agents:videoops." + stage,
  sourceId: "videoops." + stage,
  permissions: { minimum: "PROPOSE", maximum: "ACT" },
  contracts: { agent: "fixture", skill: "fixture" },
  source: { agentHash: hash, skillHash: hash },
  capabilities: { required: [] },
});
test("saved VideoOps setup loads privately without changing ordinary Workcell context and can be disabled", async () => {
  const runtime = await realpath(
    await mkdtemp(join(tmpdir(), "city-video-settings-")),
  );
  try {
    const before = {
      DOCKER_CONTEXT: "ordinary-workcell",
      CITY_WORKCELL_IMAGE: "separate-image",
    };
    expect(await videoopsLaunchEnv(runtime, before)).toEqual(before);
    await saveVideoopsSettings(runtime, {
      image: "sha256:" + "a".repeat(64),
      runtimeLockSha256: await videoopsRuntimeLockSha256(),
      dockerContext: "video-context",
      modelBinding: {
        endpoint: "http://127.0.0.1:1/v1/chat/completions",
        model: "fixture",
      },
      planner: profile("creative-director"),
      scout: profile("asset-scout"),
      editor: profile("hyperframes-editor"),
      capabilities: { planner: [], scout: [], editor: [] },
    });
    const file = join(runtime, "videoops-config.json");
    expect((await stat(file)).mode & 0o077).toBe(0);
    const next = await videoopsLaunchEnv(runtime, before);
    expect(next.CITY_VIDEOOPS_CONFIG).toBe(file);
    expect(next.DOCKER_CONTEXT).toBe(before.DOCKER_CONTEXT);
    expect(
      (
        await videoopsLaunchEnv(runtime, {
          ...before,
          CITY_VIDEOOPS_CONFIG: "",
        })
      ).CITY_VIDEOOPS_CONFIG,
    ).toBe("");
    await chmod(file, 0o644);
    await expect(videoopsLaunchEnv(runtime, before)).rejects.toThrow("private");
    await chmod(file, 0o600);
    const current = JSON.parse(await readFile(file, "utf8"));
    for (const runtimeLockSha256 of [undefined, "0".repeat(64)]) {
      await writeFile(file, JSON.stringify({ ...current, runtimeLockSha256 }));
      expect(await videoopsLaunchEnv(runtime, before)).toEqual(before);
      await expect(readVideoopsLaunchConfig(file)).rejects.toThrow(
        "setup:videoops --build",
      );
      expect((await stat(file)).isFile()).toBe(true);
    }
    await saveVideoopsSettings(runtime, null);
    expect(await videoopsLaunchEnv(runtime, before)).toEqual(before);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});
