import { stageVideoopsRender } from "../../apps/runner/videoops-render-input";
import { validateProjectExports } from "../../apps/runner/project-exports";
import { stageWorkcellProject } from "../../apps/runner/workcell-project";
import { verifyWorkcellEvidence } from "../../apps/runner/workcell-evidence";
import { reportedWorkcellFailure } from "./observation-status";
import { boundedCommand } from "../../apps/runner/bounded-command";
import { appendFile, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."),
  runtime = resolve(root, process.env.CITY_RUNTIME_DIR || ".runtime"),
  source = resolve(runtime, "workcell-source"),
  // Keep disposable clones beside the private runtime by default. On macOS,
  // /var/folders TMPDIR is often outside Docker/Colima file sharing.
  scratch = resolve(
    process.env.CITY_WORKCELL_TMPDIR || resolve(runtime, "scratch"),
  );
const run = process.env.CITY_RUN || "workcell-invocation-" + Date.now(),
  producer = process.env.CITY_PRODUCER || "review-workcell-" + Date.now();
const spool =
  process.env.CITY_SPOOL || resolve(runtime, "spool-" + producer + ".jsonl");
async function emit(
  capability: string,
  id: string,
  phase: string,
  outcome: string,
  metadata: Record<string, string> = {},
) {
  try {
    const line =
      JSON.stringify({
        schema: "kujo.lifecycle.v1",
        producer_instance: producer,
        profile: "local-workcell-invocation",
        run_id: run,
        agent_id: "workcell-host",
        task_id: process.env.CITY_TASK || "",
        operation_id: id,
        attempt: 1,
        kind: "internal",
        capability,
        phase,
        outcome,
        occurred_at_ms: Date.now(),
        metadata,
      }) + "\n";
    const used = await stat(spool)
      .then((s) => s.size)
      .catch(() => 0);
    if (used + Buffer.byteLength(line) > 262144) {
      await writeFile(spool + ".gap", "overflow");
      return;
    }
    await appendFile(spool, line);
  } catch {
    /* Observation failure must never stop Workcell. */
  }
}
async function command(cmd: string, args: string[], cwd: string) {
  return boundedCommand(cmd, args, {
    cwd,
    timeoutMs: process.env.CITY_WORKCELL_VIDEOOPS_FILE ? 330_000 : 90_000,
    env: {
      ...process.env,
      TMPDIR: scratch,
      KUJO:
        process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
    },
  });
}
await mkdir(scratch, { recursive: true, mode: 0o700 });
await mkdir(source, { recursive: true });
if (!(await stat(resolve(source, ".git")).catch(() => null))) {
  await writeFile(
    resolve(source, "README.md"),
    "Original Agent City Workcell proof input.\n",
  );
  for (const args of [
    ["init"],
    ["add", "README.md"],
    [
      "-c",
      "user.name=Agent City Proof",
      "-c",
      "user.email=proof@localhost",
      "commit",
      "-m",
      "Initialize isolated Workcell proof input",
    ],
  ]) {
    const r = await command("git", args, source);
    if (r.code !== 0) throw Error(r.output);
  }
}
// This directory is a dedicated generated proof repository. Ignore only its own receipts.
const ignore = resolve(source, ".gitignore");
if ((await readFile(ignore, "utf8").catch(() => "")) !== ".workcell/\n") {
  await writeFile(ignore, ".workcell/\n");
  await command("git", ["add", ".gitignore"], source);
  const saved = await command(
    "git",
    [
      "-c",
      "user.name=Agent City Proof",
      "-c",
      "user.email=proof@localhost",
      "commit",
      "-m",
      "Ignore generated Workcell evidence",
    ],
    source,
  );
  if (saved.code !== 0) throw Error(saved.output);
}
const definition = JSON.parse(
  await readFile(resolve(root, "../workcell/workcell.json"), "utf8"),
);
definition.name = "agent-city-workcell";
// This adapter grants only a generated-file execution, never sibling project policy.
definition.network = { mode: "none" };
definition.environment = { allow: [], set: {} };
definition.secrets = [];
definition.filesystem = { read_only_root: true, tmpfs: ["/tmp"] };
definition.workspace = { mount_path: "/workspace", strategy: "git-worktree" };
definition.cleanup = { keep_failed: false };
definition.trust_profile = "contained-standard";
for (const integration of Object.values(definition.integrations) as any[])
  integration.enabled = false;
definition.runtime.image = process.env.CITY_WORKCELL_IMAGE || "alpine:3.20";
definition.command = [
  "sh",
  "-c",
  'printf "Agent City real container artifact\\n" > city-result.txt',
];
definition.artifacts.export = ["city-result.txt"];
// Optional explicit generated-code proof: only a bounded copied file enters the
// disposable workspace. No command or host mount is derived from its content.
if (process.env.CITY_WORKCELL_KUJO_FILE) {
  const input = resolve(process.env.CITY_WORKCELL_KUJO_FILE);
  if (!(await stat(input)).isFile() || (await stat(input)).size > 65536)
    throw Error(
      "Kujo proof input must be a regular file no larger than 64 KiB",
    );
  const code = await readFile(input, "utf8");
  if (!code.trim() || Buffer.byteLength(code) > 65536)
    throw Error("Invalid Kujo proof input");
  await writeFile(resolve(source, "input.kujo"), code, { mode: 0o600 });
  for (const args of [
    ["add", "input.kujo"],
    [
      "-c",
      "user.name=Agent City Proof",
      "-c",
      "user.email=proof@localhost",
      "commit",
      "--allow-empty",
      "-m",
      "Record explicit Kujo proof input",
    ],
  ]) {
    const result = await command("git", args, source);
    if (result.code !== 0) throw Error(result.output);
  }
  if (process.env.CITY_WORKCELL_PROJECT_FILE) {
    const snapshot = JSON.parse(
      await readFile(process.env.CITY_WORKCELL_PROJECT_FILE, "utf8"),
    );
    await stageWorkcellProject(source, snapshot.files);
    for (const args of [
      ["add", "--", "project"],
      [
        "-c",
        "user.name=Agent City",
        "-c",
        "user.email=proof@localhost",
        "commit",
        "-m",
        "Record explicitly granted project input snapshots",
      ],
    ]) {
      const result = await command("git", args, source);
      if (result.code !== 0) throw Error(result.output);
    }
  }
  definition.command = [
    "sh",
    "-c",
    "kujo --version > runtime-version.txt && kujo run input.kujo --interpreter > city-result.txt",
  ];
  definition.artifacts.export = ["city-result.txt", "runtime-version.txt"];
}

const videoops = process.env.CITY_WORKCELL_VIDEOOPS_FILE;
const evidenceLimits: Record<string, number> = {};
if (videoops) {
  if (
    process.env.CITY_WORKCELL_KUJO_FILE ||
    process.env.CITY_WORKCELL_PROJECT_FILE ||
    process.env.CITY_PROJECT_EXPORTS_FILE
  )
    throw Error("VideoOps requires its own isolated invocation");
  if (!/^sha256:[a-f0-9]{64}$/.test(process.env.CITY_WORKCELL_IMAGE || ""))
    throw Error(
      "VideoOps requires an explicitly selected immutable local render image",
    );
  const info = await stat(videoops);
  if (!info.isFile() || info.size > 600000)
    throw Error("VideoOps input exceeds limit");
  await stageVideoopsRender(
    source,
    JSON.parse(await readFile(videoops, "utf8")),
    resolve(videoops, "../media"),
  );
  for (const args of [
    ["add", "--", "production", "render-request.json"],
    [
      "-c",
      "user.name=Agent City",
      "-c",
      "user.email=proof@localhost",
      "commit",
      "-m",
      "Record explicit isolated video input",
    ],
  ]) {
    const result = await command("git", args, source);
    if (result.code !== 0) throw Error("Could not freeze video input");
  }
  definition.command = ["node", "/opt/agent-city-videoops/render.mjs"];
  definition.artifacts.export = [
    "output/draft.mp4",
    "output/metadata.json",
    "output/check.json",
  ];
  Object.assign(evidenceLimits, {
    "output/draft.mp4": 33554432,
    "output/metadata.json": 1048576,
    "output/check.json": 2097152,
  });
  definition.artifacts.limits = Object.fromEntries(
    Object.entries(evidenceLimits).map(([path, max_bytes]) => [
      path,
      { max_bytes, max_files: 1, max_depth: 1 },
    ]),
  );
  definition.artifacts.max_files = 3;
  definition.artifacts.max_bytes = 36700160;
  definition.resources.memory = "4g";
  definition.resources.pids = 512;
}
const projectExports = validateProjectExports(
  process.env.CITY_PROJECT_EXPORTS_FILE
    ? JSON.parse(await readFile(process.env.CITY_PROJECT_EXPORTS_FILE, "utf8"))
    : undefined,
  !!process.env.CITY_WORKCELL_KUJO_FILE,
);
definition.artifacts.export.push(
  ...projectExports.map((path) => "project/" + path),
);
if (projectExports.length) {
  definition.artifacts.limits = Object.fromEntries(
    projectExports.map((path) => [
      "project/" + path,
      { max_bytes: 16384, max_files: 1, max_depth: 1 },
    ]),
  );
  definition.artifacts.max_files = projectExports.length + 2;
  definition.artifacts.max_bytes = 4_000_000 + 200 + 32768;
}
definition.resources.timeout_ms = videoops ? 300000 : 30000;
const file = resolve(runtime, "workcell-definition.json");
await writeFile(file, JSON.stringify(definition));
await emit("execution.run", "invocation", "started", "unset");
await emit("workcell.execute", "workload", "started", "unset", {
  resultCode: "invoked",
});
const result = await command(
  resolve(root, "../workcell/bin/workcell"),
  [
    "run",
    "--file",
    file,
    "--repo",
    source,
    "--no-pull",
    "--summary",
    ...(process.env.CITY_WORKCELL_CANCEL_FILE
      ? ["--cancel-file", resolve(process.env.CITY_WORKCELL_CANCEL_FILE)]
      : []),
  ],
  source,
);
const summary = result.output
  .split("\n")
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .find((x) => x?.schema_version === "workcell-run-summary/v1");
const receiptRef = /^wc-[a-f0-9]{32}$/.test(summary?.run_id || "")
  ? summary.run_id
  : "unknown";
let evidence: Awaited<ReturnType<typeof verifyWorkcellEvidence>> | null = null;
let evidenceError: string | null = null;
if (result.code === 0) {
  try {
    evidence = await verifyWorkcellEvidence(
      source,
      summary,
      definition.artifacts.export,
      evidenceLimits,
    );
  } catch (error) {
    evidenceError =
      error instanceof Error ? error.message : "Evidence verification failed";
  }
}
const succeeded =
  result.code === 0 &&
  !result.timedOut &&
  !result.spawnError &&
  evidence !== null;
if (succeeded || reportedWorkcellFailure(result, summary))
  await emit(
    "workcell.execute",
    "workload",
    "finished",
    succeeded ? "succeeded" : "failed",
    {
      workcellRef: receiptRef,
      resultCode: result.timedOut
        ? "host-timeout:cleanup-unknown"
        : result.spawnError ||
          (evidenceError
            ? "evidence-unverified"
            : String(summary?.stage ?? "unknown") + ":exit-" + result.code),
    },
  );
else
  await emit("workcell.execute", "coverage", "gap", "unknown", {
    resultCode: "disconnect",
  });
if (succeeded && evidence)
  for (const artifact of evidence.artifacts)
    await emit(
      "artifact.created",
      "container-artifact:" + artifact.name,
      "finished",
      "succeeded",
      {
        workcellRef: receiptRef,
        artifactRef: "workcell:" + receiptRef + ":" + artifact.name,
      },
    );
await emit(
  "execution.run",
  "invocation",
  "finished",
  succeeded ? "succeeded" : "failed",
);
await writeFile(
  resolve(runtime, "workcell-proof.json"),
  JSON.stringify(
    { run, producer, ...result, summary, evidence, evidenceError },
    null,
    2,
  ),
);
if (!succeeded) throw Error(evidenceError || result.output);
console.log(JSON.stringify({ run, producer, summary }));
