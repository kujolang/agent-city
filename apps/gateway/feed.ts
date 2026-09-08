import { digest } from "./normalize";
export async function boundedText(res: Response, limit = 1048576) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw Error("page exceeds byte limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function validatePage(
  body: string,
  headers: Headers,
  sourceSequence: number,
) {
  if (digest(body) !== headers.get("x-watchdog-sha256"))
    throw Error("page checksum mismatch");
  const encoded = headers.get("x-watchdog-manifest");
  if (!encoded || encoded.length > 16384) throw Error("missing manifest");
  const manifest = JSON.parse(Buffer.from(encoded, "base64").toString());
  const rows = body.trim()
    ? body.split("\n").map((line) => JSON.parse(line))
    : [];
  if (
    manifest.jsonl_version !== "watchdog.jsonl.v2" ||
    manifest.schema_version !== "watchdog.telemetry.v2" ||
    manifest.sha256 !== digest(body) ||
    manifest.record_count !== rows.length ||
    Number(headers.get("x-watchdog-record-count")) !== rows.length ||
    manifest.next_cursor !== headers.get("x-watchdog-next-cursor") ||
    manifest.first_sequence_exclusive !== sourceSequence
  )
    throw Error("feed manifest mismatch");
  let previous = sourceSequence;
  let retentionGap = false;
  for (const row of rows) {
    if (!Number.isSafeInteger(row.sequence) || row.sequence <= previous)
      throw Error("feed order mismatch");
    if (
      row.record_id !== row.record.record_id ||
      row.producer !== row.record.source.producer
    )
      throw Error("canonical wrapper identity mismatch");
    if (row.sequence !== previous + 1) retentionGap = true;
    previous = row.sequence;
  }
  if (previous !== manifest.last_sequence_inclusive)
    throw Error("manifest sequence mismatch");
  return {
    rows,
    manifest,
    retentionGap,
    next: manifest.next_cursor as string,
    sequence: previous,
  };
}

export function continuity(
  manifest: any,
  prior: { epoch: string; sequence: number; anchor: string },
) {
  if (
    typeof manifest.store_epoch !== "string" ||
    !/^[a-f0-9]{32}$/.test(manifest.store_epoch) ||
    !Number.isSafeInteger(manifest.store_last_sequence) ||
    !Number.isSafeInteger(manifest.retained_first_sequence) ||
    manifest.store_last_sequence < 0 ||
    manifest.retained_first_sequence < 0 ||
    manifest.retained_first_sequence > manifest.store_last_sequence ||
    typeof manifest.cursor_anchor !== "string" ||
    typeof manifest.next_anchor !== "string"
  )
    throw Error("Watchdog continuity metadata unavailable");
  if (prior.epoch && manifest.store_epoch !== prior.epoch) return "replacement";
  if (prior.sequence > manifest.store_last_sequence) return "rollback";
  if (
    prior.sequence &&
    (!prior.epoch || manifest.cursor_anchor !== prior.anchor)
  )
    return "anchor";
  return null;
}
