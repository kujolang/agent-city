import "./style.css";
import { appearance } from "../../packages/renderer-pixi/appearance";
import { CityRenderer } from "../../packages/renderer-pixi/index";
import {
  badge,
  buildingState,
  followComplete,
  animationFor,
  activityCounts,
  initialTruth,
  initialPresentation,
  reduceTruth,
  plan,
  advance,
  visualLabel,
  type Scene,
  type Truth,
  type Presentation,
} from "../../packages/world-core/index";
import { validateEvent, type CityEvent } from "../../packages/protocol/index";
const $ = (s: string) => document.querySelector(s) as HTMLElement;
$("#app").innerHTML =
  `<header><div><h1>KUJO / AGENT CITY</h1><small>LOCAL OBSERVER · PHASE 1 / OBSERVER</small></div><div class="status" id="health">UNKNOWN</div></header><main><section><div class="world"><div class="strip"><span id="scene">CITY / OVERWORLD</span><span>256 × 240 · WEBGL</span></div><div id="canvas"></div><div id="notice">Connecting to canonical telemetry…</div><nav><button data-scene="city">City</button><button data-scene="workshop">Workshop</button><button data-scene="library">Library</button><button data-scene="mcp">MCP Terminal</button><button data-scene="dojo">Dojo</button><button data-scene="dispatch">Dispatch HQ</button><button data-scene="meeting">Meeting / Handoff</button><button id="pause">Pause animation</button></nav><section id="building" aria-label="Building inspector"></section></div><h3>OBSERVED EXECUTIONS</h3><label>Roster <select id="filter"><option value="all">All instances</option><option value="active">Active operations</option><option value="failed">Failure history</option><option value="completed">Completed executions</option></select></label><div class="roster" id="roster"></div><p class="muted">Original geometric Kujo artwork. Only observed execution instances appear. Offline model fixture; actual SDK execution and local RAG retrieval.</p><h3>CANONICAL ACTIVITY</h3><ul class="log" id="log"></ul></section><aside><h2>EXECUTION INSPECTOR</h2><p id="selection" class="muted">Select an observed execution.</p><button id="follow">Follow selected instance</button><h3>CURRENT TRUTH</h3><div class="truth" id="truth">UNKNOWN</div><dl id="details"></dl><h3>VISUAL ACTIVITY</h3><div class="label" id="visual">UNKNOWN</div><h3>OPERATIONS / ATTEMPTS</h3><div id="operations"></div><h3>EVIDENCE REFERENCES</h3><div class="evidence" id="evidence">UNKNOWN</div></aside></main><footer><span>READ-ONLY · No task assignment, chat, stop or tool controls.</span><span>Truth is immediate. Presentation is evidence-linked.</span></footer><dialog><button id="close">Close evidence</button><pre id="record"></pre></dialog>`;
let truth = initialTruth(),
  presentation = initialPresentation(),
  selected: string | null = null,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  health = "UNKNOWN",
  events: CityEvent[] = [],
  stream: EventSource | null = null,
  lastGateway = 0,
  rosterKey = "",
  operationKey = "",
  evidenceKey = "",
  inspectedBuilding: Scene | null = null,
  rosterFilter = "all";
const renderer = new CityRenderer();
const choose = (id: string) => {
  selected = id;
  renderer.selected = id;
  renderDOM();
};
function building(id: string) {
  renderer.follow = null;
  renderer.scene = id as Scene;
  inspectedBuilding = id === "city" ? null : (id as Scene);

  renderDOM();
}
try {
  await renderer.init($("#canvas"), choose, building);
  new ResizeObserver(() => {
    const scale = Math.max(
      1,
      Math.min(3, Math.floor($("#canvas").clientWidth / 256)),
    );
    const canvas = $("#canvas canvas");
    canvas.style.width = 256 * scale + "px";
    canvas.style.height = 240 * scale + "px";
  }).observe($("#canvas"));
} catch {
  $("#canvas").textContent =
    "WebGL unavailable. Current truth and evidence remain available below.";
}
function renderDOM() {
  $("#health").textContent = health + (truth.gap ? " · PARTIAL COVERAGE" : "");
  $("#scene").textContent =
    renderer.scene.toUpperCase() +
    " / " +
    (renderer.scene === "city" ? "OVERWORLD" : "INTERIOR");
  $("#pause").textContent = paused ? "Resume animation" : "Pause animation";
  $("#notice").textContent = truth.gap
    ? "Coverage gap retained. Missing lifecycle observations are not reconstructed."
    : "LIVE = current operation · RECENT = observed completed work · UNKNOWN = no source";
  if (inspectedBuilding) {
    const state = buildingState(inspectedBuilding, truth, Date.now(), health);
    const rows = [
      state.id.toUpperCase() + " / " + state.sourceHealth,
      `${state.active} active · ${state.failures} retained failures · ${state.operations.length} observed operations`,
      "STATIONS: " +
        state.stations
          .map((o) => o.id + " [" + o.sourceHealth + "]")
          .join(" / "),
      "Coverage: " + state.completeness,
    ];
    if (!state.operations.length)
      rows.push("NOT YET CONNECTED — no activity inferred from this room.");
    if (inspectedBuilding === "meeting")
      rows.push(
        "Relationships are asynchronous context packets at current stations; no observed dialogue.",
      );
    $("#building").textContent = rows.join("\n");
  } else
    $("#building").textContent = renderer.follow
      ? "FOLLOW / " +
        renderer.scene.toUpperCase() +
        " · inspect this building for station and source state"
      : "CITY OVERVIEW / select a building or an execution";
  const nextRosterKey =
    Object.keys(truth.agents).join("|") + selected + rosterFilter + truth.order;
  if (nextRosterKey !== rosterKey) {
    rosterKey = nextRosterKey;
    $("#roster").replaceChildren(
      ...Object.values(truth.agents)
        .filter(
          (a) =>
            rosterFilter === "all" ||
            (rosterFilter === "active" &&
              Object.values(a.operations).some((o) => o.status === "active")) ||
            (rosterFilter === "failed" &&
              Object.values(a.operations).some((o) => o.status === "failed")) ||
            (rosterFilter === "completed" && a.status === "completed"),
        )
        .map((a, i) => {
          const b = document.createElement("button");
          b.textContent = `${badge(a.id)} ${a.profile === "local-eval-invocation" ? "VERIFY" : a.profile === "local-workcell-invocation" ? "WORKCELL" : a.profile === "local-mcp-worker" ? "MCP" : a.profile === "unknown" ? "UNKNOWN" : "DOCS"} · ${a.id.split(":").at(-1)}`;
          b.setAttribute("aria-pressed", String(a.id === selected));
          b.title = a.id;
          b.onclick = () => choose(a.id);
          return b;
        }),
    );
  }
  const a = selected ? truth.agents[selected] : undefined,
    w = selected ? presentation.walkers[selected] : undefined;
  $("#selection").textContent = a ? a.id : "Select an observed execution.";
  $("#truth").textContent = a?.status.toUpperCase() || "UNKNOWN";
  $("#visual").textContent =
    visualLabel(w, a, health) +
    (w ? " · " + w.scene + " / " + w.phase : "") +
    (w?.visit && a
      ? " · " +
        Object.entries(activityCounts(w, a))
          .map(([k, v]) => v + " " + k)
          .join(" / ")
      : "");
  $("#follow").textContent = renderer.follow
    ? "Following " + renderer.follow.split(":").at(-1)
    : "Follow selected instance";
  const fields = a
    ? {
        Profile: a.profile,
        Appearance: appearance(a.profile).id,
        Instance: a.id,
        Presence:
          health === "LIVE" ? "Observed; runtime presence UNKNOWN" : "STALE",
        Task:
          a.task.namespace === "unknown"
            ? "UNKNOWN"
            : a.task.namespace + ":" + a.task.id,
        Run: a.run.namespace + ":" + a.run.id,
        "Task status": a.taskState ?? "UNKNOWN",
        "Workflow state": a.workflowState ?? "UNKNOWN",
        "Last observed":
          new Date(a.lastObserved).toLocaleTimeString() +
          (Date.now() - a.lastObserved > 30000 ? " · RECENT" : ""),
        "Visual pose": w ? animationFor(w, a, presentation.tick) : "UNKNOWN",
        "Active ops": Object.values(a.operations).filter(
          (o) => o.status === "active",
        ).length,
        Workcell:
          Object.values(a.operations)
            .map((o) => o.metadata?.workcellRef)
            .filter(Boolean)
            .join(", ") || "UNKNOWN",
        Repo:
          Object.values(a.operations)
            .map((o) => o.metadata?.repoRef)
            .filter(Boolean)
            .join(", ") || "UNKNOWN",
        Artifacts:
          Object.values(a.operations)
            .map((o) => o.metadata?.artifactRef)
            .filter(Boolean)
            .join(", ") || "UNKNOWN",
        Completeness: a.completeness,
      }
    : {};
  $("#details").replaceChildren(
    ...Object.entries(fields).flatMap(([k, v]) => {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = String(v);
      return [dt, dd];
    }),
  );
  const nextOpKey = selected + ":" + truth.order;
  if (nextOpKey !== operationKey) {
    operationKey = nextOpKey;
    $("#operations").replaceChildren(
      ...Object.values(a?.operations ?? {})
        .reverse()
        .map((o) => {
          const button = document.createElement("button");
          button.className = "operation";
          button.dataset.status = o.status;
          button.textContent = `${o.capability} / ${o.operationId ?? o.key} · attempt ${o.attempt ?? "UNKNOWN"} · ${o.status.toUpperCase()}`;
          button.onclick = () => {
            $("#record").textContent = JSON.stringify(
              {
                currentTruth: o,
                visualActivity: w?.visit ?? null,
                instance: a?.id,
                task: a?.task,
                run: a?.run,
              },
              null,
              2,
            );
            document.querySelector("dialog")!.showModal();
          };
          return button;
        }),
    );
  }
  const selectedEvents = events
    .filter((e) => "instance" in e && e.instance === selected)
    .slice(-12);
  const nextEvidenceKey = selected + ":" + truth.order;
  if (evidenceKey !== nextEvidenceKey) {
    evidenceKey = nextEvidenceKey;
    $("#evidence").replaceChildren(
      ...selectedEvents.map((e) => {
        const row = document.createElement("div"),
          link = document.createElement("a");
        link.href = "/api/evidence/" + e.eventId;
        link.textContent = e.type + " · " + e.evidence[0].recordId;
        link.onclick = async (event) => {
          event.preventDefault();
          const r = await fetch(link.href);
          $("#record").textContent = JSON.stringify(await r.json(), null, 2);
          document.querySelector("dialog")!.showModal();
        };
        row.append(link);
        return row;
      }),
    );
    if (!selectedEvents.length)
      $("#evidence").textContent = a
        ? Object.values(a.operations)
            .flatMap((o) => o.evidence.map((e) => e.recordId))
            .join("\n")
        : "UNKNOWN";
  }
  $("#log").replaceChildren(
    ...events
      .slice(-20)
      .reverse()
      .map((e) => {
        const li = document.createElement("li");
        li.textContent =
          new Date(e.observedAt).toLocaleTimeString() +
          " · " +
          e.type +
          ("operation" in e
            ? " · " + e.operation.capability + " · " + e.operation.outcome
            : " · " + e.reason);
        return li;
      }),
  );
}
$("#filter").onchange = (e) => {
  rosterFilter = (e.target as HTMLSelectElement).value;
  renderDOM();
};
$("#follow").onclick = () => {
  if (selected) {
    renderer.follow = renderer.follow ? null : selected;
    if (renderer.follow) inspectedBuilding = null;
    renderDOM();
  }
};
$("#pause").onclick = () => {
  paused = !paused;
  renderDOM();
};
$("#close").onclick = () => document.querySelector("dialog")!.close();
document.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach(
  (b) =>
    (b.onclick = () => {
      renderer.follow = null;
      renderer.scene = b.dataset.scene as Scene;
      building(b.dataset.scene!);
    }),
);
async function connect() {
  stream?.close();
  const r = await fetch("/api/world/snapshot");
  if (!r.ok) throw Error("gateway unavailable");
  const snap = await r.json();
  truth = snap.truth;
  events = snap.recent ?? [];
  health = snap.sourceHealth.status;
  lastGateway = performance.now();
  for (const a of Object.values(truth.agents))
    if (!presentation.walkers[a.id])
      presentation.walkers[a.id] = {
        id: a.id,
        scene: "workshop",
        x: 32 + (Object.keys(presentation.walkers).length % 5) * 40,
        homeX: 32 + (Object.keys(presentation.walkers).length % 5) * 40,
        y: 160,
        phase: "work",
        age: 0,
        visit: null,
        queued: [],
        visits: 0,
      };
  stream = new EventSource(
    "/api/world/events?after=" + encodeURIComponent(snap.cursor),
  );
  stream.addEventListener("world", (event) => {
    try {
      const e = JSON.parse((event as MessageEvent).data);
      validateEvent(e);
      truth = reduceTruth(truth, e);
      presentation = plan(presentation, e);
      events = [...events, e].slice(-2000);
      renderDOM();
    } catch {
      health = "UNKNOWN";
      stream?.close();
      renderDOM();
    }
  });
  stream.addEventListener("reset", () => {
    void connect();
  });
  stream.onerror = () => {
    health = "STALE";
    renderDOM();
  };
  renderDOM();
}
try {
  await connect();
} catch {
  health = "STALE";
  renderDOM();
}
setInterval(async () => {
  try {
    const r = await fetch("/api/world/snapshot");
    if (!r.ok) throw Error();
    const s = await r.json();
    health = s.sourceHealth.status;
    lastGateway = performance.now();
    if (!stream || stream.readyState === EventSource.CLOSED) await connect();
  } catch {
    health = "STALE";
  }
  renderDOM();
}, 1000);
setInterval(() => {
  if (!paused) presentation = advance(presentation, truth);
  if (renderer.follow) {
    const a = truth.agents[renderer.follow],
      w = presentation.walkers[renderer.follow];
    if (followComplete(w, a)) renderer.follow = null;
  }
  if (renderer.app.renderer) renderer.draw(presentation, truth, health);
  if (presentation.tick % 4 === 0) renderDOM();
}, 50);
// Read-only diagnostics for deterministic browser assertions; no source mutation.
Object.defineProperty(window, "agentCity", {
  get: () => ({
    truth,
    presentation,
    selected,
    scene: renderer.scene,
    follow: renderer.follow,
    health,
    paused,
  }),
});
