import { spawn } from "node:child_process";
import { appendFile, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."),
  runtime = resolve(root, ".runtime"),
  source = resolve(runtime, "workcell-source");
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
        task_id: "",
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
  let output = "";
  const p = spawn(cmd, args, {
    cwd,
    env: { ...process.env, KUJO: resolve(root, "../kujo/target/release/kujo") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", (d) => (output = (output + d).slice(-131072)));
  p.stderr.on("data", (d) => (output = (output + d).slice(-131072)));
  const code = await new Promise<number | null>((ok, fail) => {
    p.on("error", fail);
    p.on("exit", ok);
  });
  return { code, output };
}
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
definition.runtime.image = "alpine:3.20";
definition.command = [
  "sh",
  "-c",
  'printf "Agent City real container artifact\\n" > city-result.txt',
];
definition.artifacts.export = ["city-result.txt"];
definition.resources.timeout_ms = 30000;
const file = resolve(runtime, "workcell-definition.json");
await writeFile(file, JSON.stringify(definition));
await emit("execution.run", "invocation", "started", "unset");
await emit("workcell.execute", "workload", "started", "unset", {
  resultCode: "invoked",
});
const result = await command(
  resolve(root, "../workcell/bin/workcell"),
  ["run", "--file", file, "--repo", source, "--no-pull", "--summary"],
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
const receiptRef = summary?.run_id || "unknown";
await emit(
  "workcell.execute",
  "workload",
  "finished",
  result.code === 0 ? "succeeded" : "failed",
  {
    workcellRef: receiptRef,
    resultCode: String(summary?.stage ?? "unknown") + ":exit-" + result.code,
  },
);
if (result.code === 0)
  await emit(
    "artifact.created",
    "container-artifact",
    "finished",
    "succeeded",
    {
      workcellRef: receiptRef,
      artifactRef: "workcell:" + receiptRef + ":city-result.txt",
    },
  );
await emit(
  "execution.run",
  "invocation",
  "finished",
  result.code === 0 ? "succeeded" : "failed",
);
await writeFile(
  resolve(runtime, "workcell-proof.json"),
  JSON.stringify({ run, producer, ...result, summary }, null, 2),
);
if (result.code !== 0) throw Error(result.output);
console.log(JSON.stringify({ run, producer, summary }));
