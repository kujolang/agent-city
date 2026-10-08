/** Mirrors the contained-standard, host-identity Workcell admission requirements.
 * Read-only preflight only; Workcell still enforces the actual execution policy. */
export function assertDockerWorkcellSecurity(info: unknown) {
  const options = (info as { SecurityOptions?: unknown } | null)
    ?.SecurityOptions;
  if (!Array.isArray(options) || options.some((v) => typeof v !== "string"))
    throw Error(
      "Docker security capabilities are UNKNOWN. Inspect the selected engine before enabling Workcell.",
    );
  const has = (name: string) =>
    options.some(
      (v: string) => v.toLowerCase().split(",")[0] === "name=" + name,
    );
  if (!has("seccomp"))
    throw Error(
      "Workcell requires Docker seccomp support. Select a compatible engine; do not disable security policy.",
    );
  if (has("rootless"))
    throw Error(
      "This City Workcell adapter uses host workspace identity; rootless Docker requires a separately configured rootless identity adapter.",
    );
  if (!has("apparmor"))
    throw Error(
      "Workcell requires AppArmor for this rootful Docker engine. Docker Desktop without AppArmor is unsupported; select a compatible Linux or dedicated VM Docker context. No model task should be started.",
    );
}
