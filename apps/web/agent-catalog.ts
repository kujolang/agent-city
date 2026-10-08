/** Catalog profiles are not execution instances and never create city citizens. */
export function mountAgentCatalog(host: HTMLElement) {
  const details = document.createElement("details");
  details.innerHTML =
    '<summary>Agent profiles / teams</summary><p>Imported role contracts. These are not running agents.</p><button type="button">Refresh profiles</button><p role="status"></p><label>Team <select><option value="">All teams</option></select></label><div aria-label="Imported agent profiles"></div><pre tabindex="0" aria-label="Selected agent contract"></pre>';
  host.append(details);
  const status = details.querySelector("p[role=status]")!;
  const team = details.querySelector("select")!;
  const list = details.querySelector("div")!;
  const selected = details.querySelector("pre")!;
  let profiles: any[] = [];
  function render() {
    list.replaceChildren();
    for (const profile of profiles.filter(
      (p) => !team.value || p.team === team.value,
    )) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${profile.name} · ${profile.executionStatus}`;
      button.onclick = () => {
        selected.textContent = [
          profile.name,
          `Profile: ${profile.id}`,
          `Team: ${profile.team} · version ${profile.version}`,
          `Permission contract: ${profile.permissions.minimum} → ${profile.permissions.maximum}`,
          `Required capabilities: ${profile.capabilities.required.join(", ") || "None declared"}`,
          `Tool references (not grants): ${Object.values(profile.tools).flat().join(", ") || "None"}`,
          `Workflow references (not connected): ${profile.workflows.join(", ") || "None declared"}`,
          `Execution: ${profile.executionStatus}`,
          profile.reason,
          `Source: ${profile.source.repository}/${profile.source.path}`,
          `Manifest SHA-256: ${profile.source.manifestHash}`,
          "Local source import with content hashes; upstream authenticity is not verified. Contracts are guidance, not an execution sandbox.",
        ].join("\n");
      };
      list.append(button);
    }
  }
  team.onchange = render;
  async function refresh() {
    status.textContent = "Reading imported catalog…";
    try {
      const response = await fetch("/control/agents");
      if (!response.ok) throw Error("Catalog unavailable");
      const catalog = await response.json();
      profiles = catalog.profiles;
      team.replaceChildren(new Option("All teams", ""));
      for (const name of [
        ...new Set(profiles.map((p) => String(p.team))),
      ].sort())
        team.add(new Option(name, name));
      status.textContent = catalog.imported
        ? `${profiles.length} imported profiles. ${profiles.filter((p) => p.executionStatus === "DRAFT_REVIEW_ONLY").length} support PROPOSE draft/review; other capabilities remain unconnected.`
        : "No catalog imported. Managed install: run ../start.command agents:import from the Agent City directory. Source checkout: npm run agents:import -- /path/to/kujo-agents. Use the same CITY_PORT_OFFSET/CITY_RUNTIME_DIR as this instance.";
      selected.textContent = "";
      render();
    } catch {
      status.textContent = "Catalog unavailable; no profiles were inferred.";
      profiles = [];
      render();
    }
  }
  details.querySelector("button")!.onclick = () => void refresh();
  details.addEventListener("toggle", () => {
    if (details.open) void refresh();
  });
}
