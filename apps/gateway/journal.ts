import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { validateEvent, type CityEvent } from "../../packages/protocol/index";
import {
  initialTruth,
  reduceTruth,
  reduceMany,
  type Truth,
} from "../../packages/world-core/index";
import {
  canonical,
  CORE_VERSION,
  REPLAY_VERSION,
  type ReplayBundle,
} from "../../packages/world-core/replay";
export const sha = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export class Journal {
  readonly db: DatabaseSync;
  state: Truth;
  constructor(
    path: string,
    readonly quota = 1000000,
  ) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS journal(seq INTEGER PRIMARY KEY,id TEXT UNIQUE,hash TEXT,body TEXT); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);",
    );
    this.state = JSON.parse(
      this.get("truth") || JSON.stringify(initialTruth()),
    );
    const checkpointHash = this.get("checkpointHash");
    if (checkpointHash && checkpointHash !== sha(this.state)) {
      this.db.close();
      throw Error("Checkpoint checksum mismatch");
    }
    const tail = this.db
      .prepare("SELECT body FROM journal WHERE seq>? ORDER BY seq")
      .all(this.state.order) as { body: string }[];
    for (const row of tail)
      this.state = reduceTruth(this.state, JSON.parse(row.body));
  }
  get(key: string) {
    return (
      this.db.prepare("SELECT value FROM meta WHERE key=?").get(key) as
        | { value: string }
        | undefined
    )?.value;
  }
  set(key: string, value: string) {
    this.db.prepare("INSERT OR REPLACE INTO meta VALUES(?,?)").run(key, value);
  }
  append(input: CityEvent[], metadata: Record<string, string> = {}) {
    let next = this.state;
    const accepted: CityEvent[] = [];
    const find = this.db.prepare("SELECT hash,body FROM journal WHERE id=?");
    const insert = this.db.prepare("INSERT INTO journal VALUES(?,?,?,?)");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const raw of input) {
        validateEvent(raw);
        const event = { ...raw, order: this.state.order + accepted.length + 1 };
        const hash = sha({ ...event, order: 0, observedAt: 0 });
        const old = find.get(event.eventId) as
          | { hash: string; body: string }
          | undefined;
        if (old) {
          // Older journals used insertion-order SHA. Recompute from their saved event.
          if (
            sha({ ...JSON.parse(old.body), order: 0, observedAt: 0 }) !== hash
          )
            throw Error("record identity conflict");
          continue;
        }
        if (event.order > this.quota)
          throw Error(
            "Journal quota reached; ingestion paused, evidence retained",
          );

        insert.run(event.order, event.eventId, hash, JSON.stringify(event));
        accepted.push(event);
      }
      next = reduceMany(this.state, accepted);
      if (
        Math.floor(next.order / 1000) !== Math.floor(this.state.order / 1000)
      ) {
        this.set("truth", JSON.stringify(next));
        this.set("checkpointHash", sha(next));
      }
      for (const [k, v] of Object.entries(metadata)) this.set(k, v);
      this.db.exec("COMMIT");
      this.state = next;
      return accepted;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  events(run?: string): CityEvent[] {
    const rows = (
      run
        ? this.db
            .prepare(
              "SELECT body FROM journal WHERE json_extract(body,'$.run.namespace') || ':' || json_extract(body,'$.run.id') = ? ORDER BY seq",
            )
            .all(run)
        : this.db.prepare("SELECT body FROM journal ORDER BY seq").all()
    ) as { body: string }[];
    return rows.map((r) => JSON.parse(r.body));
  }

  bundle(versions: ReplayBundle["versions"], run?: string): ReplayBundle {
    const events = this.events(run);
    let snapshot = initialTruth();
    for (const e of events) snapshot = reduceTruth(snapshot, e);
    const body: Omit<ReplayBundle, "checksum"> = {
      schema: REPLAY_VERSION,
      versions,
      workspace: "local-agent-city" as const,
      completeness: run
        ? "run subset; source health outside selection excluded"
        : events.length && events[0].order !== 1
          ? "partial; earlier journal observations unavailable"
          : snapshot.gap
            ? "partial"
            : "observed journal; producer coverage not guaranteed",
      profileBindings: Object.fromEntries(
        Object.values(snapshot.agents).map((a) => [a.id, a.profile]),
      ),
      causalReferences: events.flatMap((e) =>
        "operation" in e && e.operation.relatedAgent
          ? [{ eventId: e.eventId, relatedInstance: e.operation.relatedAgent }]
          : [],
      ),
      events,
      snapshot,
    };
    return { ...body, checksum: sha(body) };
  }
  close() {
    this.db.close();
  }
}
