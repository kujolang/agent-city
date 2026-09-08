import { test, expect } from "vitest";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Journal, sha } from "../apps/gateway/journal";
import {
  replay,
  verifyReplay,
  CORE_VERSION,
} from "../packages/world-core/replay";
import { reduceTruth, initialTruth } from "../packages/world-core/index";
import type { CityEvent } from "../packages/protocol/index";
const events: CityEvent[] = readFileSync(
  "tests/fixtures/phase1-observations.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const versions = {
  protocol: "1",
  adapter: "1",
  core: CORE_VERSION,
  map: "1",
  mapHash: "test-map",
  coreHash: "test-core",
};
test("pinned real journal replays identically and detects snapshot/version corruption", () => {
  const j = new Journal(":memory:");
  j.append(events);
  const b = j.bundle(versions);
  expect(sha(verifyReplay(b))).toBe(sha(replay(b.events)));
  expect(sha(j.bundle(versions))).toBe(sha(b));
  expect(() => verifyReplay({ ...b, snapshot: initialTruth() })).toThrow(
    "snapshot",
  );
  expect(() =>
    verifyReplay({ ...b, versions: { ...versions, core: "future" } }),
  ).toThrow("version");
  expect(() => replay([b.events[0], b.events[0]])).toThrow("identity");
  j.close();
});
test("durable retries, identity conflicts, malformed data and quota roll back atomically", () => {
  const j = new Journal(":memory:", 2);
  const first = events[0];
  j.append([first], { sourceCursor: "one" });
  expect(j.append([first])).toHaveLength(0);
  expect(() =>
    j.append([{ ...first, source: "conflict" } as CityEvent], {
      sourceCursor: "bad",
    }),
  ).toThrow("identity");
  expect(() =>
    j.append([
      {
        ...first,
        eventId: "new",
        unknown: "private prompt",
      } as unknown as CityEvent,
    ]),
  ).toThrow();
  expect(j.get("sourceCursor")).toBe("one");
  expect(j.state.order).toBe(1);
  expect(() =>
    j.append([
      { ...first, eventId: "two" },
      { ...first, eventId: "three" },
    ]),
  ).toThrow("quota");
  expect(j.state.order).toBe(1);
  expect(j.events()).toHaveLength(1);
  j.close();
});
test("restart preserves cursor and complete journal; reducer leaves prior snapshots immutable", () => {
  const dir = mkdtempSync(join(tmpdir(), "city-journal-"));
  const path = join(dir, "journal.sqlite");
  let j = new Journal(path);
  j.append(events, { sourceCursor: "cursor" });
  const hash = sha(j.state);
  j.close();
  j = new Journal(path);
  expect(j.get("sourceCursor")).toBe("cursor");
  expect(sha(j.state)).toBe(hash);
  expect(j.append(events)).toHaveLength(0);
  const before = j.state;
  const copy = sha(before);
  reduceTruth(before, {
    ...events[0],
    eventId: "fresh",
    order: before.order + 1,
  });
  expect(sha(before)).toBe(copy);
  j.close();
  rmSync(dir, { recursive: true });
});

test("checkpoints detect altered snapshots before serving truth", () => {
  const dir = mkdtempSync(join(tmpdir(), "city-checkpoint-"));
  const path = join(dir, "journal.sqlite");
  const j = new Journal(path);
  j.set("truth", JSON.stringify(initialTruth()));
  j.set("checkpointHash", "altered");
  j.close();
  expect(() => new Journal(path)).toThrow("Checkpoint checksum");
  rmSync(dir, { recursive: true });
});
