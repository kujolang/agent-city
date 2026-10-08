import { assertDockerWorkcellSecurity } from "./docker-security";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { boundedCommand } from "./bounded-command";

/** Read-only admission check. Never pulls an image, starts a container or grants consent. */
export async function assertWorkcellAvailable(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
  run: typeof boundedCommand = boundedCommand,
) {
  let definition;
  try {
    await access(resolve(root, "../workcell/bin/workcell"), constants.X_OK);
    definition = JSON.parse(
      await readFile(resolve(root, "../workcell/workcell.json"), "utf8"),
    );
  } catch {
    throw Error(
      "Workcell source is missing or invalid. Update the managed installation or restore the pinned sibling Workcell checkout.",
    );
  }
  const backend = definition?.runtime?.backend;
  if (backend !== "docker" && backend !== "podman")
    throw Error(
      "Mission Workcell requires a configured local Docker or Podman backend.",
    );
  const image = env.CITY_WORKCELL_IMAGE?.trim();
  if (!image || image.startsWith("-"))
    throw Error(
      "Select a trusted local Kujo image with CITY_WORKCELL_IMAGE before submitting this mission.",
    );
  const options = { cwd: root, env, timeoutMs: 5_000, graceMs: 500 };
  const engine = await run(
    backend,
    ["info", "--format", "{{json .}}"],
    options,
  );
  if (engine.code !== 0 || engine.timedOut || engine.spawnError)
    throw Error(
      `Workcell ${backend} backend is unavailable. Start the selected engine and check its context or connection, then resubmit. No mission was started.`,
    );
  if (backend === "docker")
    assertDockerWorkcellSecurity(JSON.parse(engine.output));
  const found = await run(
    backend,
    ["image", "inspect", "--format", "{{.Id}}", image],
    options,
  );
  if (
    found.code !== 0 ||
    found.timedOut ||
    found.spawnError ||
    !found.output.trim()
  )
    throw Error(
      "The configured Workcell image is not available locally in the selected backend. Install a trusted Kujo image there and resubmit. Agent City did not pull or execute it.",
    );
}
