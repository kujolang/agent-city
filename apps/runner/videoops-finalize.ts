import { createHash } from "node:crypto";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";
/** Explicit local artifact finalization, never publication. Source attempts remain intact. */
export async function finalizeVideoops(
  options: {
    agentsRepository: string;
    missionDirectory: string;
    id: string;
    decision: unknown;
  },
  execute = boundedCommand,
) {
  const decision = options.decision as any;
  if (
    !decision ||
    Object.keys(decision).some(
      (k) => !["candidateSha256", "confirmed"].includes(k),
    ) ||
    decision.confirmed !== true ||
    !/^[a-f0-9]{64}$/.test(decision.candidateSha256)
  )
    throw Error("Explicit exact-candidate finalization required");
  if (!/^mission-[a-f0-9-]{36}$/.test(options.id))
    throw Error("Invalid mission identity");
  const repo = await realpath(options.agentsRepository),
    mission = await realpath(options.missionDirectory);
  const workspace = resolve(mission, ".city-production/review-1");
  if ((await realpath(workspace)) !== workspace)
    throw Error("Review workspace redirected");
  const executable = resolve(repo, "videoops/tools/bin/videoops");
  if (
    (await realpath(executable)) !== executable ||
    !(await lstat(executable)).isFile()
  )
    throw Error("Canonical VideoOps executable required");
  const priorFile = resolve(mission, "receipt.json");
  const priorInfo = await lstat(priorFile);
  if (
    !priorInfo.isFile() ||
    priorInfo.size > 65536 ||
    (await realpath(priorFile)) !== priorFile
  )
    throw Error("Mission receipt unavailable");
  const prior = JSON.parse(await readFile(priorFile, "utf8"));
  if (
    prior.schema !== "agent-city.videoops-mission.v1" ||
    prior.id !== options.id ||
    prior.kind !== "videoops" ||
    prior.status !== "review-pending" ||
    prior.code !== 0 ||
    !Number.isFinite(Date.parse(prior.startedAt))
  )
    throw Error("Rendered mission receipt required");
  async function native(args: string[]) {
    const result = await execute(
      executable,
      ["review", ...args, "--workspace", workspace],
      {
        cwd: repo,
        env: { PATH: process.env.PATH, LANG: "C.UTF-8", PYTHONNOUSERSITE: "1" },
        timeoutMs: 10000,
        graceMs: 1000,
      },
    );
    if (result.code !== 0 || result.timedOut)
      throw Error(
        "Finalization unavailable; inspect native ledger before retry",
      );
    const status = JSON.parse(result.output);
    if (
      status.state !== "APPROVED" ||
      status.technical !== "PASS" ||
      status.perceptual !== "PASS" ||
      status.candidate?.sha256 !== decision.candidateSha256
    )
      throw Error("Exact candidate is not approved by every configured gate");
    return status;
  }
  await native(["status"]);
  const promoted = await native([
    "promote",
    "--destination",
    "output/final.mp4",
    "--authorize-local",
  ]);
  if (
    promoted.final?.path !== "output/final.mp4" ||
    promoted.final?.sha256 !== decision.candidateSha256
  )
    throw Error("Native final artifact identity mismatch");
  const file = resolve(workspace, "output/final.mp4"),
    info = await lstat(file);
  if (!info.isFile() || info.size > 33554432 || (await realpath(file)) !== file)
    throw Error("Final artifact unavailable");
  const bytes = await readFile(file);
  if (
    bytes.length !== info.size ||
    createHash("sha256").update(bytes).digest("hex") !==
      decision.candidateSha256
  )
    throw Error("Final artifact checksum mismatch");
  const receipt = {
    schema: "agent-city.videoops-finalization.v1",
    id: options.id,
    kind: "videoops",
    status: "completed",
    code: 0,
    startedAt: prior.startedAt,
    finishedAt: new Date().toISOString(),
    productionStatus: "approved",
    candidateSha256: decision.candidateSha256,
    native: promoted,
    final: {
      path: "output/final.mp4",
      sha256: decision.candidateSha256,
      bytes: bytes.length,
    },
    publication: "NOT_PERFORMED",
  };
  const destination = resolve(mission, "finalization.json");
  try {
    await writeFile(destination, JSON.stringify(receipt, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
  } catch (error: any) {
    if (error.code !== "EEXIST") throw error;
    const existing = JSON.parse(await readFile(destination, "utf8"));
    if (
      existing.candidateSha256 !== decision.candidateSha256 ||
      existing.id !== options.id
    )
      throw Error("Conflicting finalization receipt");
    return existing;
  }
  return receipt;
}
