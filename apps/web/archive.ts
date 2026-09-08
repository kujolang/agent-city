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
    '<h3>RUNLEDGER / ARCHIVE</h3><p>Read-only source run correlation. Receipt metadata is not lifecycle truth.</p><button id="archive-refresh">Browse runs</button><label>Run <select id="archive-run" aria-label="Archive run"></select></label><label>Compare <select id="archive-compare" aria-label="Compare run"></select></label><button id="archive-inspect">Inspect timeline / attempts</button><button id="archive-replay">Replay pinned run</button><button id="archive-live">Return to live</button><div id="archive-runs" class="archive-runs"></div><pre id="archive-detail" tabindex="0" aria-live="polite"></pre><h3>WATCHDOG / INCIDENTS</h3><button id="incident-refresh">Refresh source incidents</button><pre id="incident-detail" tabindex="0"></pre>';
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
    for (const id of ["archive-run", "archive-compare"]) {
      q(id).replaceChildren(
        ...runs.map((r) => {
          const o = document.createElement("option");
          o.value = r.id;
          o.textContent = r.id;
          return o;
        }),
      );
      if (id === "archive-compare") {
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "No comparison";
        q(id).prepend(none);
        (q(id) as HTMLSelectElement).value = "";
      }
    }
  };
  async function bundle(run: string): Promise<ReplayBundle> {
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
  function runPanel(id: string, b: ReplayBundle) {
    const panel = document.createElement("section");
    panel.className = "archive-run-panel";
    panel.setAttribute("aria-label", "Archived run " + id);
    const heading = document.createElement("h4");
    heading.textContent = id;
    const coverage = document.createElement("p");
    coverage.textContent = "RECORDED TRUTH · " + b.completeness;
    panel.append(heading, coverage);
    for (const agent of Object.values(b.snapshot.agents)) {
      const identity = document.createElement("p");
      identity.textContent = agent.id + " · " + agent.status;
      panel.append(identity);
      for (const operation of Object.values(agent.operations)) {
        const row = document.createElement("details");
        const title = document.createElement("summary");
        title.textContent =
          operation.capability +
          " · attempt " +
          (operation.attempt ?? "UNKNOWN") +
          " · " +
          operation.status;
        const metadata = document.createElement("pre");
        metadata.textContent = JSON.stringify(operation, null, 2);
        row.append(title, metadata);
        panel.append(row);
      }
    }
    const timeline = document.createElement("ol");
    timeline.setAttribute("aria-label", "Observed timeline " + id);
    for (const event of b.events) {
      const row = document.createElement("li");
      const link = document.createElement("a");
      link.href = "/api/evidence/" + encodeURIComponent(event.eventId);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent =
        "#" + event.order + " " + event.type + " · " + event.eventId;
      row.append(link);
      timeline.append(row);
    }
    panel.append(timeline);
    return panel;
  }
  const action = (id: string, fn: () => Promise<unknown> | void) =>
    (q(id).onclick = async () => {
      // Prevent overlapping requests from relabeling old results as a new run.
      const controls = Array.from(
        host.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
          "button, select",
        ),
      );
      controls.forEach((control) => (control.disabled = true));
      q("archive-runs").replaceChildren();
      try {
        await fn();
      } catch (e) {
        output({ error: String(e) });
      } finally {
        controls.forEach((control) => (control.disabled = false));
      }
    });
  action("archive-refresh", load);
  action("archive-inspect", async () => {
    const selected = (q("archive-run") as HTMLSelectElement).value;
    const compared = (q("archive-compare") as HTMLSelectElement).value;
    const ids = [...new Set([selected, compared].filter(Boolean))];
    if (!ids.length) throw Error("Choose an observed run");
    // Each run must pass the same checksum/version/snapshot checks as replay.
    const bundles = await Promise.all(ids.map((id) => bundle(id)));
    q("archive-runs").replaceChildren(
      ...bundles.map((b, i) => runPanel(ids[i], b)),
    );
    output({
      mode: "READ-ONLY COMPARISON",
      runs: bundles.map((b, i) => ({
        id: ids[i],
        summary: runs.find((run) => run.id === ids[i]),
        versions: b.versions,
        checksum: b.checksum,
        completeness: b.completeness,
        timeline: b.events,
        artifacts: Object.values(b.snapshot.agents).flatMap((a) =>
          Object.values(a.operations)
            .map((o) => o.metadata?.artifactRef)
            .filter(Boolean),
        ),
      })),
    });
  });
  action("archive-replay", async () => {
    const b = await bundle((q("archive-run") as HTMLSelectElement).value);
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
