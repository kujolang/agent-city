import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { recoverStoppedWorkcell } from "../apps/runner/workcell-orphans";
const [source, temporaryRoot, runId, apply] = process.argv.slice(2);
if (!source || !temporaryRoot || !runId || apply !== "--apply") {
  console.log(
    "Usage: npm run recover:workcell -- <source-repo> <temporary-root> <wc-run-id> --apply\nStop the owning Agent City/Workcell supervisor first. Removes only stopped, exactly owned resources; never reruns work or changes its outcome.",
  );
  process.exit(0);
}
const result = await recoverStoppedWorkcell({
  root: resolve(import.meta.dirname, ".."),
  source,
  temporaryRoot,
  runId,
});
await writeFile(
  resolve(source, ".workcell/runs", runId, "city-cleanup.json"),
  JSON.stringify({ ...result, checkedAt: new Date().toISOString() }, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify(result));
if (result.cleanup !== "complete") process.exitCode = 1;
