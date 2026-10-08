import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
  readVideoopsLaunchConfig,
  type VideoopsLaunchConfig,
} from "./videoops-mission";
export async function saveVideoopsSettings(
  runtime: string,
  value: VideoopsLaunchConfig | null,
) {
  await mkdir(runtime, { recursive: true, mode: 0o700 });
  if (!(await lstat(runtime)).isDirectory())
    throw Error("Private runtime directory required");
  const file = resolve(runtime, "videoops-config.json");
  if (value === null) {
    await rm(file, { force: true });
    return;
  }
  const temporary = file + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
    await readVideoopsLaunchConfig(temporary);
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}
export async function videoopsLaunchEnv(
  runtime: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NodeJS.ProcessEnv> {
  if (env.CITY_VIDEOOPS_CONFIG !== undefined) return { ...env };
  const file = resolve(runtime, "videoops-config.json");
  const info = await lstat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return { ...env };
  if (
    !info.isFile() ||
    (info.mode & 0o077) !== 0 ||
    (process.getuid && info.uid !== process.getuid())
  )
    throw Error(
      "Saved VideoOps setup must be private and owned by the current user",
    );
  await readVideoopsLaunchConfig(file);
  return { ...env, CITY_VIDEOOPS_CONFIG: file };
}
