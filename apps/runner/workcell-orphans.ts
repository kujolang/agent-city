import { lstat, readFile, realpath, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { boundedCommand } from "./bounded-command";

/** Cleanup is independent evidence, never a recovered workload outcome. */
export async function recoverStoppedWorkcell(options: {
  root: string;
  source: string;
  temporaryRoot: string;
  runId: string;
}) {
  if (!/^wc-[a-f0-9]{32}$/.test(options.runId))
    throw Error("Invalid run identity");
  const source = await realpath(options.source);
  const temporaryRoot = await realpath(options.temporaryRoot);
  const workspace = resolve(temporaryRoot, "kujo-workcell-" + options.runId);
  const marker = workspace + ".owner";
  const file = resolve(source, ".workcell/runs", options.runId, "receipt.json");
  if ((await realpath(file)) !== file || (await lstat(file)).size > 1048576)
    throw Error("Receipt path or size invalid");
  const original = await readFile(file, "utf8");
  const receipt = JSON.parse(original);
  if (
    receipt.run_id !== options.runId ||
    receipt.source_repository !== source ||
    receipt.workspace_path !== workspace ||
    receipt.workspace_strategy !== "git-worktree" ||
    receipt.final_status !== "prepared" ||
    receipt.cleanup_status !== "pending" ||
    !["docker", "podman"].includes(receipt.runtime_backend)
  )
    throw Error("Receipt does not establish a pending owned workspace");
  const name = "kujo-workcell-" + options.runId;
  if (receipt.container_name !== name)
    throw Error("Container identity mismatch");
  const command = async (
    exe: string,
    args: string[],
    cwd = source,
    env = process.env,
  ) => {
    const r = await boundedCommand(exe, args, { cwd, env, timeoutMs: 10000 });
    if (r.code !== 0 || r.timedOut || r.spawnError)
      throw Error("Recovery command failed; cleanup remains unknown");
    return r.output.trim();
  };
  const engine = receipt.runtime_backend;
  const ids = await command(engine, [
    "ps",
    "-a",
    "--filter",
    "label=dev.kujo.workcell.run_id=" + options.runId,
    "--format",
    "{{.ID}}",
  ]);
  const rows = ids ? ids.split("\n") : [];
  if (rows.length > 1) throw Error("Ambiguous container identity");
  const id = rows[0];
  if (id) {
    if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error("Invalid container ID");
    const details = JSON.parse(await command(engine, ["inspect", id]));
    const c = details[0];
    if (
      details.length !== 1 ||
      c.Name !== "/" + name ||
      c.Config?.Labels?.["dev.kujo.workcell.run_id"] !== options.runId
    )
      throw Error("Container ownership mismatch");
    if (
      c.State?.Running !== false ||
      !["exited", "dead"].includes(c.State?.Status)
    )
      return {
        cleanup: "pending",
        reason: "container-active",
        sourceOutcome: "unknown",
      };
  }
  // Verify ownership before removing either resource. Do not follow links.
  const exists = await lstat(workspace).catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  const owner = await lstat(marker).catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
  if (exists || owner) {
    if (
      !owner?.isFile() ||
      owner.isSymbolicLink() ||
      owner.size > 128 ||
      (await realpath(marker)) !== marker ||
      (await readFile(marker, "utf8")) !==
        "workcell-run-id=" + options.runId + "\n" ||
      (exists &&
        (!exists.isDirectory() ||
          exists.isSymbolicLink() ||
          (await realpath(workspace)) !== workspace))
    )
      throw Error("Workspace ownership mismatch");
  }
  // No --force: an intervening container start must refuse removal.
  if (id) await command(engine, ["rm", id]);
  if (exists || owner) {
    const workcell = resolve(options.root, "../workcell");
    const script = resolve(
      workcell,
      ".city-recovery-" + randomUUID() + ".kujo",
    );
    const input = JSON.stringify({
      strategy: "git-worktree",
      workspace_path: workspace,
      source_root: source,
    });
    try {
      await writeFile(
        script,
        'from src.workspace.workspace import cleanup_workspace\nr := cleanup_workspace(parse_json(env("CITY_RECOVERY_INPUT")), false)\nif r["ok"] != true {exit(1)}\n',
        { flag: "wx", mode: 0o600 },
      );
      await command(
        process.env.KUJO_BIN ||
          resolve(options.root, "../kujo/target/release/kujo"),
        ["run", script, "--interpreter"],
        workcell,
        { ...process.env, TMPDIR: temporaryRoot, CITY_RECOVERY_INPUT: input },
      );
    } finally {
      await unlink(script).catch((e) => {
        if (e.code !== "ENOENT") throw e;
      });
    }
  }
  if ((await readFile(file, "utf8")) !== original)
    throw Error("Source receipt changed during recovery");
  if (
    (await lstat(workspace).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    })) ||
    (await lstat(marker).catch((e) => {
      if (e.code === "ENOENT") return null;
      throw e;
    }))
  )
    throw Error("Workspace cleanup incomplete");
  return {
    cleanup: "complete",
    sourceOutcome: "unknown",
    sourceReceiptUnchanged: true,
    runId: options.runId,
  };
}
