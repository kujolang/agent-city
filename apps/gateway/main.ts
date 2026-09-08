import { boundedText, validatePage } from "./feed";
import { createServer, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { normalize, digest, UnboundObservation } from "./normalize";
import {
  reduceTruth,
  initialTruth,
  type Truth,
} from "../../packages/world-core/index";
import { validateEvent, type CityEvent } from "../../packages/protocol/index";
const root = resolve(import.meta.dirname, "../.."),
  runtime = resolve(root, ".runtime");
await mkdir(runtime, { recursive: true });
const sourcePrefix = process.env.CITY_SOURCE_PREFIX || "";
const db = new DatabaseSync(
  process.env.CITY_DB || resolve(runtime, "city.sqlite"),
);
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS journal(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE,hash TEXT,body TEXT); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);",
);
const get = (key: string) =>
  (
    db.prepare("SELECT value FROM meta WHERE key=?").get(key) as
      | { value: string }
      | undefined
  )?.value;
const set = (key: string, value: string) =>
  db.prepare("INSERT OR REPLACE INTO meta VALUES(?,?)").run(key, value);
const epoch = get("epoch") || randomUUID();
set("epoch", epoch);
let state: Truth = JSON.parse(get("truth") || JSON.stringify(initialTruth()));
let sourceSequence = Number(get("sourceSequence") || 0);
let sourceCursor = get("sourceCursor") || "",
  lastSuccess = 0,
  lastError = "",
  gap = false;
const clients = new Set<ServerResponse>();
const cursor = (n: number) => epoch + ":" + n;
function publish(e: CityEvent) {
  for (const res of clients) {
    if (res.writableLength > 1024 * 1024) {
      res.end();
      clients.delete(res);
    } else
      res.write(
        `id: ${cursor(e.order)}\nevent: world\ndata: ${JSON.stringify(e)}\n\n`,
      );
  }
}
function store(
  events: CityEvent[],
  nextCursor?: string,
  nextSequence?: number,
) {
  const accepted: CityEvent[] = [];
  let next = state;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const event of events) {
      const hash = digest(
          JSON.stringify({ ...event, order: 0, observedAt: 0 }),
        ),
        old = db
          .prepare("SELECT hash FROM journal WHERE id=?")
          .get(event.eventId) as { hash: string } | undefined;
      if (old) {
        if (old.hash !== hash) throw Error("record identity conflict");
        continue;
      }
      event.order = next.order + 1;
      validateEvent(event);
      next = reduceTruth(next, event);
      db.prepare("INSERT INTO journal(seq,id,hash,body) VALUES(?,?,?,?)").run(
        event.order,
        event.eventId,
        hash,
        JSON.stringify(event),
      );
      accepted.push(event);
    }
    set("truth", JSON.stringify(next));
    if (nextCursor !== undefined) set("sourceCursor", nextCursor);
    if (nextSequence !== undefined) set("sourceSequence", String(nextSequence));
    db.prepare("DELETE FROM journal WHERE seq < ?").run(
      Math.max(0, next.order - 10000),
    );
    db.exec("COMMIT");
    state = next;
    if (nextCursor !== undefined) sourceCursor = nextCursor;
    if (nextSequence !== undefined) sourceSequence = nextSequence;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  accepted.forEach(publish);
}
function healthEvent(
  type: "source.gap" | "source.reconciled",
  reason: "disconnect" | "schema" | "reconciled",
): CityEvent {
  const id = randomUUID(),
    now = Date.now();
  return {
    schema: "agent-city.event.v1",
    workspace: "local-agent-city",
    eventId: id,
    source: "watchdog-local",
    order: state.order + 1,
    occurredAt: null,
    observedAt: now,
    completeness: "partial",
    type,
    reason,
    evidence: [
      {
        origin: "gateway-diagnostic",
        recordId: id,
        hash: digest(type + reason + now),
        sourceSequence: 0,
      },
    ],
  };
}
if (sourceCursor) {
  store([healthEvent("source.gap", "disconnect")]);
  gap = true;
} // Conservatively mark every process reconnect; no continuity claim across restore.
async function poll() {
  try {
    const token =
      process.env.WDG_API_AUTH_TOKEN ||
      (await readFile(resolve(runtime, "token"), "utf8"));
    const res = await fetch(
      (process.env.WATCHDOG_URL || "http://127.0.0.1:7791") +
        "/telemetry/v2/jsonl?limit=100&cursor=" +
        sourceCursor.replace(/[^a-zA-Z0-9:]/g, (c) => encodeURIComponent(c)),
      {
        headers: { authorization: "Bearer " + token },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) throw Error("Watchdog " + res.status);
    const page = validatePage(
      await boundedText(res),
      res.headers,
      sourceSequence,
    );
    const events: CityEvent[] = [];
    for (const w of page.rows) {
      try {
        const e = normalize(
          w,
          state.order + events.length + 1,
          Date.now(),
          sourcePrefix,
        );
        if (e) events.push(e);
      } catch (error) {
        if (!(error instanceof UnboundObservation)) throw error;
        const fault = healthEvent("source.gap", "schema");
        fault.eventId = digest("quarantine:" + w.record_id);
        fault.evidence = [
          {
            origin: "canonical",
            recordId: w.record_id,
            hash: digest(JSON.stringify(w.record)),
            sourceSequence: w.sequence,
          },
        ];
        events.push(fault);
      }
    }
    if (gap) events.unshift(healthEvent("source.reconciled", "reconciled"));
    store(events, page.next, page.sequence);
    gap = false;
    lastSuccess = Date.now();
    lastError = "";
  } catch (e) {
    lastError = String(e);
    if (!gap) {
      store([healthEvent("source.gap", "disconnect")]);
      gap = true;
    }
  }
}
const parseCursor = (s: string | null) => {
  if (!s) return state.order;
  const parts = s.split(":");
  if (parts.length !== 2 || parts[0] !== epoch || !/^\d+$/.test(parts[1]))
    return null;
  const n = Number(parts[1]);
  const min =
    (
      db.prepare("SELECT MIN(seq) AS n FROM journal").get() as {
        n: number | null;
      }
    ).n ?? 0;
  return n <= state.order && n >= min - 1 ? n : null;
};
const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const send = (body: unknown, status = 200) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET")
    return send({ error: "Observer Mode is read-only" }, 405);
  if (url.pathname === "/api/world/snapshot")
    return send({
      schema: "agent-city.snapshot.v1",
      epoch,
      cursor: cursor(state.order),
      truth: state,
      recent: (
        db
          .prepare("SELECT body FROM journal ORDER BY seq DESC LIMIT 200")
          .all() as { body: string }[]
      )
        .reverse()
        .map((r) => JSON.parse(r.body)),
      sourceHealth: {
        status:
          Date.now() - lastSuccess > 10000 ? "STALE" : gap ? "UNKNOWN" : "LIVE",
        gap: state.gap,
        lastSuccess,
        lastError,
        coverage:
          "SDK run and pre-model retrieval; retained local journal; reconnect history partial",
      },
      versions: { protocol: 1, core: 1, adapter: 1, world: 1 },
    });
  if (
    url.pathname === "/api/world/events" ||
    url.pathname === "/api/world/history"
  ) {
    const after = parseCursor(
      String(
        req.headers["last-event-id"] || url.searchParams.get("after") || "",
      ),
    );
    if (url.pathname.endsWith("history")) {
      if (after === null) return send({ reset: true }, 409);
      const rows = db
        .prepare("SELECT body FROM journal WHERE seq>? ORDER BY seq LIMIT 200")
        .all(after) as { body: string }[];
      return send({
        events: rows.map((r) => JSON.parse(r.body)),
        cursor: rows.length
          ? cursor(JSON.parse(rows.at(-1)!.body).order)
          : cursor(after),
      });
    }
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    if (after === null) {
      res.end("event: reset\ndata: {}\n\n");
      return;
    }
    const rows = db
      .prepare("SELECT body FROM journal WHERE seq>? ORDER BY seq LIMIT 1001")
      .all(after) as { body: string }[];
    if (rows.length > 1000) {
      res.end("event: reset\ndata: {}\n\n");
      return;
    }
    for (const r of rows) {
      const e = JSON.parse(r.body);
      res.write(`id: ${cursor(e.order)}\nevent: world\ndata: ${r.body}\n\n`);
    }
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (url.pathname.startsWith("/api/evidence/")) {
    const id = decodeURIComponent(url.pathname.slice(14));
    const row = db.prepare("SELECT body FROM journal WHERE id=?").get(id) as
      | { body: string }
      | undefined;
    return row
      ? send(JSON.parse(row.body))
      : send({ error: "unknown or expired evidence" }, 404);
  }
  send({ error: "not found" }, 404);
});
server.listen(Number(process.env.CITY_PORT || 7792), "127.0.0.1", () =>
  console.log(
    "Agent City gateway http://127.0.0.1:" + (process.env.CITY_PORT || 7792),
  ),
);
setInterval(() => {
  for (const c of clients) c.write(": heartbeat\n\n");
}, 15000).unref();
for (;;) {
  await poll();
  await new Promise((r) => setTimeout(r, 250));
}
