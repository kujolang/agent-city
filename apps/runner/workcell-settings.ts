import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

export type WorkcellSettings =
  | { schema: "agent-city.workcell-settings.v1"; enabled: false }
  | {
      schema: "agent-city.workcell-settings.v1";
      enabled: true;
      imageId: string;
      dockerContext: string;
    };

function validate(value: unknown): WorkcellSettings {
  const c = value as WorkcellSettings;
  if (
    !c ||
    c.schema !== "agent-city.workcell-settings.v1" ||
    typeof c.enabled !== "boolean" ||
    (c.enabled &&
      (!/^sha256:[a-f0-9]{64}$/.test(c.imageId) ||
        typeof c.dockerContext !== "string" ||
        !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(c.dockerContext)))
  )
    throw Error(
      "Invalid saved Workcell setup. Run setup:workcell --disable or configure it again.",
    );
  if (
    Object.keys(c).some(
      (key) =>
        ![
          "schema",
          "enabled",
          ...(c.enabled ? ["imageId", "dockerContext"] : []),
        ].includes(key),
    )
  )
    throw Error("Unexpected Workcell setup fields; execution was not enabled.");
  return c;
}

export async function saveWorkcellSettings(
  runtime: string,
  value: WorkcellSettings,
) {
  const checked = validate(value);
  await mkdir(runtime, { recursive: true, mode: 0o700 });
  if (!(await lstat(runtime)).isDirectory())
    throw Error("Workcell runtime must be a real directory.");
  const path = resolve(runtime, "workcell-settings.json");
  const temporary = path + "." + randomUUID() + ".tmp";
  try {
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(checked, null, 2) + "\n");
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

/** Explicit saved operator setup only; an image-build receipt never grants execution. */
export async function workcellLaunchEnv(
  runtime: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NodeJS.ProcessEnv> {
  if (env.CITY_ENABLE_WORKCELL !== undefined) return { ...env };
  let file;
  try {
    file = await open(
      resolve(runtime, "workcell-settings.json"),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error: any) {
    if (error.code === "ENOENT") return { ...env };
    throw error;
  }
  let value;
  try {
    const info = await file.stat();
    if (
      !info.isFile() ||
      info.size > 4096 ||
      (info.mode & 0o077) !== 0 ||
      (process.getuid && info.uid !== process.getuid())
    )
      throw Error(
        "Saved Workcell setup must be a private, owned regular file.",
      );
    value = validate(JSON.parse(await file.readFile("utf8")));
  } finally {
    await file.close();
  }
  if (!value.enabled) return { ...env };
  return {
    ...env,
    CITY_ENABLE_WORKCELL: "1",
    CITY_WORKCELL_IMAGE: env.CITY_WORKCELL_IMAGE || value.imageId,
    ...(!env.DOCKER_CONTEXT && !env.DOCKER_HOST
      ? { DOCKER_CONTEXT: value.dockerContext }
      : {}),
  };
}

export function workcellSetupCommand(
  runtime: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  const command = env.CITY_MANAGED_LAUNCHER
    ? quote(env.CITY_MANAGED_LAUNCHER) + " setup:workcell"
    : "npm run setup:workcell --";
  return `CITY_RUNTIME_DIR=${quote(runtime)} ${env.DOCKER_CONTEXT ? "DOCKER_CONTEXT=" + quote(env.DOCKER_CONTEXT) + " " : ""}${command} --build --enable`;
}
