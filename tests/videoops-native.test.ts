import { expect, test, vi } from "vitest";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boundedCommand } from "../apps/runner/bounded-command";
import { inspectVideoopsNative } from "../apps/runner/videoops-native";
vi.mock("../apps/runner/bounded-command", () => ({ boundedCommand: vi.fn() }));
test("native adapter confines operations and distinguishes observed blocked review from unavailable tool", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-videoops-native-"));
  try {
    await mkdir(join(dir, "videoops/tools/bin"), { recursive: true });
    await writeFile(join(dir, "videoops/tools/bin/videoops"), "fixture");
    const command = vi.mocked(boundedCommand);
    command.mockResolvedValue({
      code: 0,
      timedOut: false,
      output: '{"schema":"videoops-media-doctor/v1","available":true}',
    });
    const doctor = await inspectVideoopsNative({
      agentsRepository: dir,
      workspace: dir,
      operation: "media.doctor",
    });
    expect(doctor.status).toBe("observed");
    expect(doctor.productionReady).toBe(false);
    expect(command.mock.calls.at(-1)?.[1]).toEqual([
      "media",
      "doctor",
      "--workspace",
      await import("node:fs/promises").then((fs) => fs.realpath(dir)),
    ]);
    expect(Object.keys(command.mock.calls.at(-1)![2].env!)).toEqual([
      "PATH",
      "LANG",
      "PYTHONNOUSERSITE",
    ]);
    command.mockResolvedValue({
      code: 2,
      timedOut: false,
      output:
        '{"state":"BLOCKED","technical":"FAIL","perceptual":"NOT_REVIEWED"}',
    });
    expect(
      (
        await inspectVideoopsNative({
          agentsRepository: dir,
          workspace: dir,
          operation: "review.status",
        })
      ).status,
    ).toBe("observed");
    command.mockResolvedValue({
      code: 1,
      timedOut: false,
      output: '{"ok":false,"error":"MEDIA_REVIEW_OPERATION_FAILED"}',
    });
    expect(
      (
        await inspectVideoopsNative({
          agentsRepository: dir,
          workspace: dir,
          operation: "review.status",
        })
      ).status,
    ).toBe("unavailable");
    await expect(
      inspectVideoopsNative({
        agentsRepository: dir,
        workspace: dir,
        operation: "media.generate" as any,
      }),
    ).rejects.toThrow("Unsupported");
    command.mockResolvedValue({
      code: 0,
      timedOut: true,
      output: '{"schema":"videoops-media-doctor/v1"}',
    });
    expect(
      (
        await inspectVideoopsNative({
          agentsRepository: dir,
          workspace: dir,
          operation: "media.doctor",
        })
      ).status,
    ).toBe("unavailable");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
