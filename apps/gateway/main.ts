import { receipts } from "./receipts";
import { Journal, sha } from "./journal";
import { CORE_VERSION } from "../../packages/world-core/replay";
import { boundedText, validatePage, continuity } from "./feed";
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
  runtime = resolve(root, process.env.CITY_RUNTIME_DIR || ".runtime");
await mkdir(runtime, { recursive: true });
const sourcePrefix = process.env.CITY_SOURCE_PREFIX || "";
const journal = new Journal(
  process.env.CITY_DB || resolve(runtime, "city.sqlite"),
  Number(process.env.CITY_JOURNAL_LIMIT || 1000000),
);
const db = journal.db;
const get = (key: string) => journal.get(key);
const set = (key: string, value: string) => journal.set(key, value);
const epoch = get("epoch") || randomUUID();
set("epoch", epoch);
let state = journal.state;
const versions = {
  protocol: "1",
  adapter: "1",
  core: CORE_VERSION,
  map: "1",
  coreHash: sha(
    await readFile(resolve(root, "packages/world-core/index.ts"), "utf8"),
  ),
  mapHash: sha(
    JSON.parse(
      await readFile(resolve(root, "assets/compiled/world.json"), "utf8"),
    ),
  ),
};
let sourceSequence = Number(get("sourceSequence") || 0);
let sourceEpoch = get("sourceEpoch") || "",
  sourceAnchor = get("sourceAnchor") || "";
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
  identity?: { epoch: string; anchor: string },
) {
  const metadata: Record<string, string> = {};
  if (nextCursor !== undefined) metadata.sourceCursor = nextCursor;
  if (nextSequence !== undefined)
    metadata.sourceSequence = String(nextSequence);
  if (identity) {
    metadata.sourceEpoch = identity.epoch;
    metadata.sourceAnchor = identity.anchor;
  }
  const accepted = journal.append(events, metadata);
  if (identity) {
    sourceEpoch = identity.epoch;
    sourceAnchor = identity.anchor;
  }
  state = journal.state;
  if (nextCursor !== undefined) sourceCursor = nextCursor;
  if (nextSequence !== undefined) sourceSequence = nextSequence;
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
let backlog = false;
async function poll() {
  backlog = false;
  try {
    const token =
      process.env.WDG_API_AUTH_TOKEN ||
      (await readFile(resolve(runtime, "token"), "utf8"));
    const res = await fetch(
      (process.env.WATCHDOG_URL || "http://127.0.0.1:7791") +
        "/telemetry/v2/jsonl?limit=200&cursor=" +
        sourceCursor.replace(/[^a-zA-Z0-9:]/g, (c) => encodeURIComponent(c)),
      {
        headers: { authorization: "Bearer " + token },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (
      (res.status === 400 || res.status === 409 || res.status === 410) &&
      sourceCursor
    ) {
      store([healthEvent("source.gap", "disconnect")], "", 0);
      gap = true;
      lastError = "Watchdog cursor rejected; explicit gapped restart";
      return;
    }
    if (!res.ok) throw Error("Watchdog " + res.status);
    const page = validatePage(
      await boundedText(res),
      res.headers,
      sourceSequence,
    );
    const discontinuity = continuity(page.manifest, {
      epoch: sourceEpoch,
      sequence: sourceSequence,
      anchor: sourceAnchor,
    });
    if (discontinuity) {
      store([healthEvent("source.gap", "schema")], "", 0, {
        epoch: page.manifest.store_epoch,
        anchor: "",
      });
      gap = true;
      lastError = "Explicit source continuity reset: " + discontinuity;
      return;
    }
    const identity = {
      epoch: page.manifest.store_epoch,
      anchor: page.manifest.next_anchor,
    };
    backlog = page.rows.length >= 200;
    const events: CityEvent[] = [];
    if (page.retentionGap) events.push(healthEvent("source.gap", "schema"));
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
    let bridgeHealthy = false;
    try {
      const heartbeat = JSON.parse(
        await readFile(resolve(runtime, "bridge-health.json"), "utf8"),
      );
      bridgeHealthy =
        heartbeat.status === "LIVE" &&
        Date.now() - heartbeat.observedAt < 10000;
    } catch {}
    if (!bridgeHealthy) {
      if (!gap) events.push(healthEvent("source.gap", "disconnect"));
      store(events, page.next, page.sequence, identity);
      gap = true;
      lastSuccess = Date.now();
      lastError = "Local observation bridge is stale or unavailable";
      return;
    }
    if (gap) events.unshift(healthEvent("source.reconciled", "reconciled"));
    store(events, page.next, page.sequence, identity);
    gap = false;
    lastSuccess = Date.now();
    lastError = "";
  } catch (e) {
    lastError =
      e instanceof Error ? e.message.slice(0, 160) : "Observation failure";
    if (!gap) {
      try {
        store([healthEvent("source.gap", "disconnect")]);
      } catch {
        /* Quota failure preserves journal; transport health remains stale. */
      }
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
const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const send = (body: unknown, status = 200) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  const origin = req.headers.origin;
  if (
    origin &&
    ![
      "http://127.0.0.1:5178",
      "http://localhost:5178",
      process.env.CITY_WEB_ORIGIN || "http://127.0.0.1:5178",
      "http://127.0.0.1:" + (process.env.CITY_PORT || "7792"),
    ].includes(origin)
  )
    return send({ error: "Origin denied" }, 403);
  if (
    !["127.0.0.1", "localhost"].includes((req.headers.host || "").split(":")[0])
  )
    return send({ error: "Host denied" }, 403);
  if (req.method !== "GET")
    return send({ error: "Observer Mode is read-only" }, 405);
  if (url.pathname === "/api/archive/replay") {
    if (state.order > 100000)
      return send(
        {
          error:
            "Replay export exceeds local response bound; use offline export",
        },
        413,
      );
    return send(
      journal.bundle(versions, url.searchParams.get("run") || undefined),
    );
  }
  if (url.pathname === "/api/archive/runs") {
    const runs = db
      .prepare(
        `SELECT json_extract(body,'$.run.namespace') || ':' || json_extract(body,'$.run.id') AS id, COUNT(*) AS events, SUM(json_extract(body,'$.type')='operation.failed') AS failures, MIN(json_extract(body,'$.operation.attempt')) AS attemptMin, MAX(json_extract(body,'$.operation.attempt')) AS attemptMax, COUNT(DISTINCT json_extract(body,'$.operation.metadata.artifactRef')) AS artifactCount FROM journal WHERE json_extract(body,'$.run.id') IS NOT NULL GROUP BY id ORDER BY MAX(seq) DESC LIMIT 200`,
      )
      .all();
    return send({
      runs,
      coverage:
        "Latest 200 runs; inspect a run for individual attempts and artifact references",
      ledger: await receipts(
        process.env.CITY_LEDGER_DIR || resolve(runtime, "release-ledger"),
      ),
      correlation:
        "Source run IDs; RunLedger receipts are external correlation evidence, not micro-events",
    });
  }
  if (url.pathname === "/api/incidents")
    return send({
      health: gap || Date.now() - lastSuccess > 10000 ? "STALE" : "LIVE",
      incidents: (
        db
          .prepare(
            "SELECT body FROM journal WHERE json_extract(body,'$.type') IN ('source.gap','source.reconciled','operation.failed') OR json_extract(body,'$.operation.metadata.approval')='pending' ORDER BY seq DESC LIMIT 200",
          )
          .all() as { body: string }[]
      )
        .reverse()
        .map((r) => JSON.parse(r.body)),
      coverage:
        "Only observed failures, gaps, recovery and explicit approval metadata; other alert/policy sources UNKNOWN",
    });
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
          Date.now() - lastSuccess > 10000 ? "STALE" : gap ? "STALE" : "LIVE",
        gap: state.gap,
        lastSuccess,
        lastError,
        coverage:
          "SDK run/retrieval/tool/handoff and Eval invocation/check results; retained local journal; reconnect history partial",
      },
      versions,
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
    let id: string;
    try {
      id = decodeURIComponent(url.pathname.slice(14));
    } catch {
      return send({ error: "invalid evidence ID" }, 400);
    }
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
  for (const c of clients) {
    if (c.writableLength > 1024 * 1024) {
      c.end();
      clients.delete(c);
    } else c.write(": heartbeat\n\n");
  }
}, 15000).unref();
for (;;) {
  await poll();
  await new Promise((r) => setTimeout(r, backlog ? 0 : 250));
}
