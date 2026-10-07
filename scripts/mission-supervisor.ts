import { resolve } from "node:path";
import { superviseMission } from "../apps/runner/mission-supervisor";
const root = resolve(import.meta.dirname, ".."),
  id = process.env.CITY_MISSION_ID || "";
const [kind, prompt] = process.argv.slice(2);
if (
  !/^mission-[a-f0-9-]{36}$/.test(id) ||
  !["code", "kujo", "writing"].includes(kind) ||
  !prompt
)
  throw Error("Invalid supervised mission identity");
process.exitCode = await superviseMission({
  directory: resolve(
    process.env.CITY_MISSIONS_DIR || resolve(root, ".runtime/missions"),
    id,
  ),
  id,
  kind,
  executable: process.execPath,
  args: ["--import", "tsx", resolve(root, "scripts/mission.ts"), kind, prompt],
  cwd: root,
  env: process.env,
});
