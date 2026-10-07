import { open } from "node:fs/promises";
import { constants } from "node:fs";

export type MissionOutcome = {
  status: "completed" | "failed";
  finishedAt: string;
};
/** A receipt is source evidence only when its terminal outcome is explicit and coherent. */
export function missionOutcome(
  value: unknown,
  expected: { id: string; kind: string; schema?: string; scope?: string },
): MissionOutcome | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    (expected.schema !== undefined && row.schema !== expected.schema) ||
    (expected.scope !== undefined && row.scope !== expected.scope) ||
    row.id !== expected.id ||
    row.kind !== expected.kind ||
    typeof row.startedAt !== "string" ||
    typeof row.finishedAt !== "string"
  )
    return null;
  const start = Date.parse(row.startedAt),
    end = Date.parse(row.finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (row.status === "completed" && row.code === 0)
    return { status: "completed", finishedAt: row.finishedAt };
  // Explicit null is the existing writer's observed signal-termination result.
  // Missing, string, boolean and contradictory codes are not terminal evidence.
  if (
    row.status === "failed" &&
    Object.hasOwn(row, "code") &&
    (row.code === null ||
      (Number.isInteger(row.code) &&
        (row.code as number) > 0 &&
        (row.code as number) <= 255))
  )
    return { status: "failed", finishedAt: row.finishedAt };
  return null;
}

/** Bounded read only; malformed/truncated evidence preserves UNKNOWN for later reconciliation. */
export async function readMissionOutcome(
  file: string,
  expected: { id: string; kind: string; schema?: string; scope?: string },
) {
  const limit = 1024 * 1024;
  let handle;
  try {
    handle = await open(
      file,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > limit) return null;
    const bytes = Buffer.alloc(limit + 1);
    let size = 0;
    while (size < bytes.length) {
      const read = await handle.read(bytes, size, bytes.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size > limit) return null;
    return missionOutcome(
      JSON.parse(bytes.subarray(0, size).toString("utf8")),
      expected,
    );
  } catch (error: any) {
    if (
      error.code === "ENOENT" ||
      error.code === "ELOOP" ||
      error instanceof SyntaxError
    )
      return null;
    throw error;
  } finally {
    await handle?.close();
  }
}
