import type { DatabaseSync } from "node:sqlite";

export const SSE_PENDING_BYTES = 1024 * 1024;
const RECONNECT_EVENTS = 1000;

export function worldFrame(cursor: string, body: string) {
  return `id: ${cursor}\nevent: world\ndata: ${body}\n\n`;
}

export function reconnectFrames(
  db: DatabaseSync,
  after: number,
  cursor: (sequence: number) => string,
  limit = SSE_PENDING_BYTES,
): string[] | null {
  const rows = db
    .prepare("SELECT seq, body FROM journal WHERE seq>? ORDER BY seq LIMIT ?")
    .iterate(after, RECONNECT_EVENTS + 1) as Iterable<{
    seq: number;
    body: string;
  }>;
  const frames: string[] = [];
  let bytes = 0;
  for (const row of rows) {
    if (frames.length === RECONNECT_EVENTS) return null;
    const frame = worldFrame(cursor(row.seq), row.body);
    bytes += Buffer.byteLength(frame);
    if (bytes > limit) return null;
    frames.push(frame);
  }
  return frames;
}
