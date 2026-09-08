import world from "../../assets/compiled/world.json";
import {
  canonical,
  verifyReplay,
  type ReplayBundle,
} from "../../packages/world-core/replay";
import { validateEvent } from "../../packages/protocol/index";
export function archiveUI(
  host: HTMLElement,
  onReplay: (bundle: ReplayBundle) => void,
  onLive: () => void,
) {
  host.innerHTML =
    '<h3>RUNLEDGER / ARCHIVE</h3><p>Read-only source run correlation. Receipt metadata is not lifecycle truth.</p><button id="archive-refresh">Browse runs</button><label>Run <select id="archive-run" aria-label="Archive run"></select></label><label>Compare <select id="archive-compare" aria-label="Compare run"></select></label><button id="archive-inspect">Inspect timeline / attempts</button><button id="archive-replay">Replay pinned run</button><button id="archive-live">Return to live</button><pre id="archive-detail" tabindex="0"></pre><h3>WATCHDOG / INCIDENTS</h3><button id="incident-refresh">Refresh source incidents</button><pre id="incident-detail" tabindex="0"></pre>';
  const q = (id: string) => host.querySelector("#" + id) as HTMLElement;
  const output = (value: unknown) =>
    (q("archive-detail").textContent = JSON.stringify(value, null, 2));
  let runs: any[] = [];
  const load = async () => {
    const r = await fetch("/api/archive/runs");
    if (!r.ok) throw Error("Archive unavailable");
    const archive = await r.json();
    runs = archive.runs;
    output({ runs, ledger: archive.ledger });
    for (const id of ["archive-run", "archive-compare"])
      q(id).replaceChildren(
        ...runs.map((r) => {
          const o = document.createElement("option");
          o.value = r.id;
          o.textContent = r.id;
          return o;
        }),
      );
  };
  async function bundle(): Promise<ReplayBundle> {
    const run = (q("archive-run") as HTMLSelectElement).value;
    if (!run) throw Error("Choose an observed run");
    const r = await fetch("/api/archive/replay?run=" + encodeURIComponent(run));
    if (!r.ok) throw Error("Replay unavailable");
    const b: ReplayBundle = await r.json();
    for (const e of b.events) validateEvent(e);
    const { checksum, ...body } = b;
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical(body)),
    );
    const actual = Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    if (actual !== checksum) throw Error("Replay checksum mismatch");
    const mapDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(canonical(world)),
    );
    const mapHash = Array.from(new Uint8Array(mapDigest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    if (b.versions.mapHash !== mapHash || b.versions.adapter !== "1")
      throw Error("Replay map or adapter version mismatch");
    verifyReplay(b);
    return b;
  }
  const action = (id: string, fn: () => Promise<unknown> | void) =>
    (q(id).onclick = () => {
      Promise.resolve()
        .then(fn)
        .catch((e) => output({ error: String(e) }));
    });
  action("archive-refresh", load);
  action("archive-inspect", async () => {
    const b = await bundle();
    output({
      selected: runs.find(
        (r) => r.id === (q("archive-run") as HTMLSelectElement).value,
      ),
      compare: runs.find(
        (r) => r.id === (q("archive-compare") as HTMLSelectElement).value,
      ),
      versions: b.versions,
      checksum: b.checksum,
      completeness: b.completeness,
      timeline: b.events,
      artifacts: Object.values(b.snapshot.agents).flatMap((a) =>
        Object.values(a.operations)
          .map((o) => o.metadata?.artifactRef)
          .filter(Boolean),
      ),
    });
  });
  action("archive-replay", async () => {
    const b = await bundle();
    onReplay(b);
    output({
      mode: "REPLAY",
      checksum: b.checksum,
      events: b.events.length,
      completeness: b.completeness,
    });
  });
  action("archive-live", onLive);
  action("incident-refresh", async () => {
    const r = await fetch("/api/incidents");
    q("incident-detail").textContent = JSON.stringify(await r.json(), null, 2);
  });
}
