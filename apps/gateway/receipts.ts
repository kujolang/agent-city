import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
/** Explicit local RunLedger directory only. Never expose prompts, costs, notes, paths or raw output. */
export async function receipts(directory: string) {
  try {
    const root = await realpath(resolve(directory, "runs"));
    const names = (await readdir(root))
      .filter((n) => /^[a-zA-Z0-9_-]+\.json$/.test(n))
      .sort()
      .slice(-200);
    const result = [];
    for (const name of names) {
      const path = await realpath(resolve(root, name));
      if (!path.startsWith(root + sep) || (await stat(path)).size > 65536)
        continue;
      const r = JSON.parse(await readFile(path, "utf8"));
      const safe = (v: unknown) =>
        typeof v === "string" && /^[a-zA-Z0-9_.:-]{1,160}$/.test(v) ? v : null;
      result.push({
        id: safe(r.id),
        status: safe(r.status),
        startCommit: safe(r.start_commit),
        endCommit: safe(r.end_commit),
        correlation: Object.fromEntries(
          [
            "dispatch_run_id",
            "eval_run_id",
            "watchdog_run_id",
            "watchdog_trace_id",
            "relay_run_id",
          ].map((k) => [k, safe(r.correlation?.[k])]),
        ),
      });
    }
    return { status: "AVAILABLE", receipts: result };
  } catch {
    return { status: "UNAVAILABLE", receipts: [] };
  }
}
