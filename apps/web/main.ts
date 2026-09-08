import "./style.css";
import { CityRenderer } from "../../packages/renderer-pixi/index";
import {
  badge,
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
  `<header><div><h1>KUJO / AGENT CITY</h1><small>LOCAL OBSERVER · VERTICAL SLICE 01</small></div><div class="status" id="health">UNKNOWN</div></header><main><section><div class="world"><div class="strip"><span id="scene">CITY / OVERWORLD</span><span>256 × 240 · WEBGL</span></div><div id="canvas"></div><div id="notice">Connecting to canonical telemetry…</div><nav><button data-scene="city">City</button><button data-scene="workshop">Workshop</button><button data-scene="library">Library</button><button data-scene="mcp">MCP Terminal</button><button data-scene="dojo">Dojo</button><button id="pause">Pause animation</button></nav><div id="building"></div></div><h3>OBSERVED EXECUTIONS</h3><div class="roster" id="roster"></div><p class="muted">Original geometric Kujo artwork. Only observed execution instances appear. Offline model fixture; actual SDK execution and local RAG retrieval.</p><h3>CANONICAL ACTIVITY</h3><ul class="log" id="log"></ul></section><aside><h2>EXECUTION INSPECTOR</h2><p id="selection" class="muted">Select an observed execution.</p><button id="follow">Follow selected instance</button><h3>CURRENT TRUTH</h3><div class="truth" id="truth">UNKNOWN</div><dl id="details"></dl><h3>VISUAL ACTIVITY</h3><div class="label" id="visual">UNKNOWN</div><h3>EVIDENCE REFERENCES</h3><div class="evidence" id="evidence">UNKNOWN</div></aside></main><footer><span>READ-ONLY · No task assignment, chat, stop or tool controls.</span><span>Truth is immediate. Presentation is evidence-linked.</span></footer><dialog><button id="close">Close evidence</button><pre id="record"></pre></dialog>`;
let truth = initialTruth(),
  presentation = initialPresentation(),
  selected: string | null = null,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  health = "UNKNOWN",
  events: CityEvent[] = [],
  stream: EventSource | null = null,
  lastGateway = 0,
  rosterKey = "";
const renderer = new CityRenderer();
const choose = (id: string) => {
  selected = id;
  renderer.selected = id;
  renderDOM();
};
function building(id: string) {
  renderer.follow = null;
  if (["workshop", "library", "mcp", "dojo"].includes(id))
    renderer.scene = id as Scene;
  $("#building").textContent = [
    "workshop",
    "library",
    "dispatch",
    "dojo",
  ].includes(id)
    ? id.toUpperCase() + " · observed operations available in the inspector"
    : id.toUpperCase() + " · NO LIVE SOURCE · NOT YET CONNECTED";
  renderDOM();
}
try {
  await renderer.init($("#canvas"), choose, building);
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
  const nextRosterKey = Object.keys(truth.agents).join("|") + selected;
  if (nextRosterKey !== rosterKey) {
    rosterKey = nextRosterKey;
    $("#roster").replaceChildren(
      ...Object.values(truth.agents).map((a, i) => {
        const b = document.createElement("button");
        b.textContent = `${badge(a.id)} ${a.profile === "local-eval-invocation" ? "VERIFY" : "DOCS"} · ${a.id.split(":").at(-1)}`;
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
    (w?.visit && a ? " · " + JSON.stringify(activityCounts(w, a)) : "");
  $("#follow").textContent = renderer.follow
    ? "Following " + renderer.follow.split(":").at(-1)
    : "Follow selected instance";
  const fields = a
    ? {
        Profile: a.profile,
        Instance: a.id,
        Presence:
          health === "LIVE" ? "Observed; runtime presence UNKNOWN" : "STALE",
        Task:
          a.task.namespace === "unknown"
            ? "UNKNOWN"
            : a.task.namespace + ":" + a.task.id,
        Run: a.run.namespace + ":" + a.run.id,
        "Task status": "UNKNOWN (Dispatch ref only)",
        "Active ops": Object.values(a.operations).filter(
          (o) => o.status === "active",
        ).length,
        Workcell: "UNKNOWN",
        Repo: "UNKNOWN",
        Artifacts: "UNKNOWN",
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
  const selectedEvents = events
    .filter((e) => "instance" in e && e.instance === selected)
    .slice(-12);
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
$("#follow").onclick = () => {
  if (selected) {
    renderer.follow = renderer.follow ? null : selected;
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
        x: 48,
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
    if (
      a?.status !== "running" &&
      w?.phase === "work" &&
      !w.queued.length &&
      w.age > 10
    )
      renderer.follow = null;
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
