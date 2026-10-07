import { test, expect, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  realpath,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { recoverStoppedWorkcell } from "../apps/runner/workcell-orphans";
const execute = vi.hoisted(() => vi.fn());
vi.mock("../apps/runner/bounded-command", () => ({ boundedCommand: execute }));
test("recovery refuses active, foreign and symlinked resources before any mutation", async () => {
  const root = await realpath(
    await mkdtemp(resolve(tmpdir(), "city-recovery-")),
  );
  const runId = "wc-" + "c".repeat(32),
    source = resolve(root, "source"),
    workspace = resolve(root, "kujo-workcell-" + runId);
  const name = "kujo-workcell-" + runId,
    id = "a".repeat(64);
  const receipt = resolve(source, ".workcell/runs", runId, "receipt.json");
  await mkdir(resolve(receipt, ".."), { recursive: true });
  await writeFile(
    receipt,
    JSON.stringify({
      run_id: runId,
      source_repository: source,
      workspace_path: workspace,
      workspace_strategy: "git-worktree",
      final_status: "prepared",
      cleanup_status: "pending",
      runtime_backend: "docker",
      container_name: name,
    }),
  );
  const opts = { root, source, temporaryRoot: root, runId };
  const respond = (details: any) =>
    execute.mockImplementation(async (_exe: string, args: string[]) => ({
      code: 0,
      timedOut: false,
      output: args[0] === "ps" ? id : JSON.stringify([details]),
    }));
  const details = {
    Name: "/" + name,
    Config: { Labels: { "dev.kujo.workcell.run_id": runId } },
    State: { Running: true, Status: "running" },
  };
  try {
    respond(details);
    expect(await recoverStoppedWorkcell(opts)).toMatchObject({
      cleanup: "pending",
      sourceOutcome: "unknown",
    });
    respond({ ...details, Config: { Labels: {} } });
    await expect(recoverStoppedWorkcell(opts)).rejects.toThrow("ownership");
    respond({ ...details, State: { Running: false, Status: "exited" } });
    await mkdir(workspace);
    await writeFile(workspace + ".owner", "wrong-owner");
    await expect(recoverStoppedWorkcell(opts)).rejects.toThrow("ownership");
    await rm(workspace + ".owner");
    await writeFile(resolve(root, "target"), "workcell-run-id=" + runId + "\n");
    await symlink(resolve(root, "target"), workspace + ".owner");
    await expect(recoverStoppedWorkcell(opts)).rejects.toThrow("ownership");
    expect(
      execute.mock.calls.every((c) => ["ps", "inspect"].includes(c[1][0])),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
    execute.mockReset();
  }
});
