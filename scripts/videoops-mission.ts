import { missionSource } from "../apps/runner/mission-source";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  readVideoopsLaunchConfig,
  validateVideoopsMission,
} from "../apps/runner/videoops-mission";
import { produceVideoops } from "../apps/runner/videoops-production";
import { validateModelConfig } from "../apps/runner/config";
const root = resolve(import.meta.dirname, "..");
const id = process.env.CITY_MISSION_ID || "";
if (!/^mission-[0-9a-f-]{36}$/.test(id))
  throw Error("Invalid video mission identity");
const request = validateVideoopsMission(
  JSON.parse(await readFile(process.argv[2], "utf8")),
);
const config = await readVideoopsLaunchConfig(
  resolve(process.env.CITY_VIDEOOPS_CONFIG || ""),
);
const workspace = resolve(
  process.env.CITY_MISSIONS_DIR || resolve(root, ".runtime/missions"),
  id,
);
await mkdir(workspace, { recursive: true, mode: 0o700 });
const startedAt = new Date().toISOString();
await writeFile(
  resolve(workspace, "request.json"),
  JSON.stringify({ ...request, id, kind: "videoops" }),
  { mode: 0o600, flag: "wx" },
);
await writeFile(resolve(workspace, "task.txt"), request.prompt, {
  mode: 0o600,
  flag: "wx",
});
const model = validateModelConfig({
  endpoint: process.env.CITY_MODEL_ENDPOINT || "",
  model: process.env.CITY_MODEL || "",
  apiKey: process.env.CITY_MODEL_API_KEY || "",
  maxOutputTokens: Number(process.env.CITY_MAX_OUTPUT_TOKENS || 8192),
  requestTimeoutSeconds: Number(process.env.CITY_MODEL_TIMEOUT_SECONDS || 90),
});
if (
  config.modelBinding &&
  (config.modelBinding.endpoint !== model.endpoint ||
    config.modelBinding.model !== model.model)
)
  throw Error(
    "Model changed since VideoOps setup; confirm the new model capabilities with setup:videoops",
  );
const producer = missionSource(id, process.env.CITY_SOURCE_PREFIX);
const result = await produceVideoops({
  root,
  workspace,
  agentsRepository: resolve(root, "../kujo-agents"),
  producer,
  run: id,
  task: id + ":task",
  spool: resolve(
    process.env.CITY_RUNTIME_DIR || resolve(root, ".runtime"),
    "spool-" + producer + ".jsonl",
  ),
  model,
  planner: config.planner,
  scout: config.scout,
  editor: config.editor,
  capabilities: {
    planner: config.capabilities.planner,
    scout: config.capabilities.scout,
  },
  editorCapabilities: config.capabilities.editor,
  image: config.image,
  dockerContext: config.dockerContext,
  width: request.width,
  height: request.height,
  timing: { fps: request.fps, durationSeconds: request.durationSeconds },
  verifiedAssets: {},
  mandatoryReview: ["visual_playback"],
  intake: [
    { path: "intake/project-brief.md", content: request.prompt },
    {
      path: "intake/messaging.md",
      content: "Preserve all requested copy and meaning. Do not invent facts.",
    },
    {
      path: "intake/audience.md",
      content:
        "Use the audience specified in the request; otherwise general adult viewers.",
    },
    {
      path: "intake/constraints.md",
      content:
        "This launcher supplies no external media or generation grant. Use original typography/vector artwork only if it satisfies the full request. Required external media/audio blocks production; never substitute or discard user requirements. Output is a silent draft for explicit human visual review, not publication.",
    },
    {
      path: "intake/references.md",
      content: "No references supplied beyond the complete original request.",
    },
    {
      path: "intake/platform.json",
      content: JSON.stringify({
        width: request.width,
        height: request.height,
        fps: request.fps,
        target_duration_seconds: request.durationSeconds,
      }),
    },
  ],
});
const uncertain = result.uncertain === true;
const status =
  result.status === "review-pending"
    ? "review-pending"
    : uncertain
      ? "unknown"
      : "failed";
await writeFile(
  resolve(workspace, "receipt.json"),
  JSON.stringify({
    schema: "agent-city.videoops-mission.v1",
    id,
    kind: "videoops",
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    productionStatus: result.status,
    uncertain,
    code: status === "review-pending" ? 0 : 1,
  }),
  { mode: 0o600, flag: "wx" },
);
process.exitCode = status === "review-pending" ? 0 : 1;
