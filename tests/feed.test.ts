import { it, expect } from "vitest";
import { validatePage, boundedText } from "../apps/gateway/feed";
import { digest } from "../apps/gateway/normalize";
const body = JSON.stringify({
  sequence: 3,
  record_id: "r",
  producer: "p",
  record: { record_id: "r", source: { producer: "p" } },
});
const headers = () =>
  new Headers({
    "x-watchdog-sha256": digest(body),
    "x-watchdog-record-count": "1",
    "x-watchdog-next-cursor": "opaque",
    "x-watchdog-manifest": Buffer.from(
      JSON.stringify({
        jsonl_version: "watchdog.jsonl.v2",
        schema_version: "watchdog.telemetry.v2",
        sha256: digest(body),
        record_count: 1,
        next_cursor: "opaque",
        first_sequence_exclusive: 0,
        last_sequence_inclusive: 3,
      }),
    ).toString("base64"),
  });
it("validates exact manifest, hash, count, namespace and ordering without assuming contiguous IDs", () => {
  expect(validatePage(body, headers(), 0).sequence).toBe(3);
  expect(() => validatePage(body + " ", headers(), 0)).toThrow("checksum");
  expect(() => validatePage(body, headers(), 2)).toThrow("manifest");
  const h = headers();
  h.set("x-watchdog-next-cursor", "different");
  expect(() => validatePage(body, h, 0)).toThrow("manifest");
});
it("cancels oversized pages before retaining the complete body", async () => {
  await expect(boundedText(new Response("too large"), 3)).rejects.toThrow(
    "byte limit",
  );
});
