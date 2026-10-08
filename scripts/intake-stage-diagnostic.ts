/** Temporary, metadata-only instrumentation; never qualifies production throughput. */
import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "../watchdog");
const name = "city_profile_" + randomUUID().replaceAll("-", "");
const entry = resolve(source, name + "_server.kujo");
const repository = resolve(source, name + "_repository.kujo");
function replaceOnce(text: string, from: string, to: string) {
  if (text.split(from).length !== 2)
    throw Error("Diagnostic anchor changed: " + from.slice(0, 60));
  return text.replace(from, to);
}
const trace = (batch: string, stage: string) =>
  `\n if ${batch}["batch_id"] == "synthetic-pipeline:batch:0" || ${batch}["batch_id"] == "synthetic-pipeline:batch:100" || ${batch}["batch_id"] == "synthetic-pipeline:batch:200" || ${batch}["batch_id"] == "synthetic-pipeline:batch:300" { print(to_json({"diagnostic":"canonical-stage","batch":${batch}["batch_id"],"stage":"${stage}","at":performance_now()})) }\n`;
let server = await readFile(resolve(source, "dashboard_server.kujo"), "utf8");
let repo = await readFile(resolve(source, "telemetry_repository.kujo"), "utf8");
server = server.replaceAll(
  "from telemetry_repository import",
  `from ${name}_repository import`,
);
server = replaceOnce(
  server,
  "\tapproved := canonical_policy_batch(body)\n\ttry {",
  trace("body", "before-policy") +
    "\tapproved := canonical_policy_batch(body)" +
    trace("approved", "after-policy") +
    "\n\ttry {",
);
server = replaceOnce(
  server,
  "\t\tresult := persist_approved_canonical_batch(approved)\n",
  "\t\tresult := persist_approved_canonical_batch(approved)\n" +
    trace("approved", "persisted"),
);
const canonicalRouteStart = server.indexOf(
  'server := server.route("POST", "/telemetry/v2/batches",',
);
const canonicalReturn = server.indexOf(
  "\t\treturn api_ok(result)",
  canonicalRouteStart,
);
if (canonicalRouteStart < 0 || canonicalReturn < 0)
  throw Error("Canonical route diagnostic anchor changed");
server =
  server.slice(0, canonicalReturn) +
  trace("approved", "after-audit") +
  server.slice(canonicalReturn);
repo = replaceOnce(
  repo,
  "func repo_insert_batch(db, batch) {",
  "func repo_insert_batch(db, batch) {" + trace("batch", "validate"),
);
repo = replaceOnce(
  repo,
  "\tprepared := repo_prepare_records(batch)\n",
  trace("batch", "prepare") + "\tprepared := repo_prepare_records(batch)\n",
);
repo = replaceOnce(
  repo,
  '\tdb_execute(db, "BEGIN IMMEDIATE", [])\n',
  trace("batch", "begin") +
    '\tdb_execute(db, "BEGIN IMMEDIATE", [])\n' +
    trace("batch", "acquired"),
);
repo = replaceOnce(
  repo,
  "\t\tresult := repo_insert_batch_rows(db, batch, prepared)\n",
  trace("batch", "rows") +
    "\t\tresult := repo_insert_batch_rows(db, batch, prepared)\n" +
    trace("batch", "rows-done"),
);
repo = replaceOnce(
  repo,
  '\t\tdb_execute(db, "COMMIT", [])\n',
  '\t\tdb_execute(db, "COMMIT", [])\n' + trace("batch", "committed"),
);
try {
  await writeFile(entry, server, { flag: "wx" });
  await writeFile(repository, repo, { flag: "wx" });
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/pipeline-blockers.ts"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        CITY_PIPELINE_DIAGNOSTIC_ENTRY: name + "_server.kujo",
      },
    },
  );
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  process.exitCode = code;
} finally {
  await unlink(entry).catch(() => {});
  await unlink(repository).catch(() => {});
}
