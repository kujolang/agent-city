import { assertDockerWorkcellSecurity } from "../apps/runner/docker-security";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { boundedCommand } from "../apps/runner/bounded-command";
import { importCatalog } from "../apps/runner/agent-catalog";
import { validateModelConfig } from "../apps/runner/config";
import { saveVideoopsSettings } from "../apps/runner/videoops-settings";
import { localRuntime } from "./local-ports";
import type { VideoopsCapabilityEvidence } from "../apps/runner/videoops-stage";
const root = resolve(import.meta.dirname, ".."),
  runtime = localRuntime(root),
  args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--disable") {
  await saveVideoopsSettings(runtime, null);
  console.log(
    "Saved VideoOps setup disabled. Restart City; running work is not interrupted.",
  );
  process.exit(0);
}
const build = args.includes("--build"),
  index = args.indexOf("--image"),
  selected = index >= 0 ? args[index + 1] : undefined;
const expected = [
  ...(build ? ["--build"] : []),
  ...(selected ? ["--image", selected] : []),
  "--enable",
  "--confirm-model-capabilities",
];
if (
  build === !!selected ||
  !args.includes("--enable") ||
  !args.includes("--confirm-model-capabilities") ||
  args.length !== expected.length ||
  args.some((a) => !expected.includes(a)) ||
  selected?.startsWith("-")
) {
  console.log(
    "Usage: setup:videoops --build --enable --confirm-model-capabilities | --image LOCAL_IMAGE --enable --confirm-model-capabilities | --disable\nExplicit setup builds/selects a local image, checks its offline toolchain and saves this Docker context. The confirmation attests that your configured model supports coding, structured JSON and the bounded long-context inputs. It is operator evidence, not an automated model qualification. Per-task rendering still requires consent; no media generation or publication is enabled.",
  );
  process.exit(args.length ? 1 : 0);
}
let model: ReturnType<typeof validateModelConfig>;
try {
  model = validateModelConfig(
    JSON.parse(
      await readFile(
        resolve(
          process.env.CITY_CONTROL_DIR || resolve(runtime, "control"),
          "model.json",
        ),
        "utf8",
      ),
    ),
  );
} catch {
  throw Error(
    "Save a valid model connection in Mission Command before VideoOps setup. No credentials are printed.",
  );
}
const definition = JSON.parse(
  await readFile(resolve(root, "../workcell/workcell.json"), "utf8"),
);
if (definition.runtime?.backend !== "docker")
  throw Error("Saved VideoOps setup requires the Docker Workcell backend");
if (process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT)
  throw Error("Select a named Docker context before saving VideoOps setup");
async function run(args: string[], timeoutMs = 10000) {
  const result = await boundedCommand("docker", args, {
    cwd: root,
    env: process.env,
    timeoutMs,
    graceMs: 1000,
  });
  if (result.code !== 0 || result.timedOut)
    throw Error(
      "VideoOps Docker setup command failed: " +
        args[0] +
        ". No new setup was saved.",
    );
  return result.output.trim();
}
assertDockerWorkcellSecurity(
  JSON.parse(await run(["info", "--format", "{{json .}}"])),
);
const context = await run(["context", "show"]);
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(context))
  throw Error("Invalid Docker context");
const imageName = selected || "agent-city-videoops:0.8.141";
if (build) {
  console.log("Building pinned VideoOps image (bounded to 10 minutes)…");
  await run(["build", "--tag", imageName, "installer/videoops"], 600000);
}
const image = await run(["image", "inspect", "--format", "{{.Id}}", imageName]);
if (!/^sha256:[a-f0-9]{64}$/.test(image))
  throw Error("Immutable local image identity unavailable");
const name = "city-videoops-setup-" + randomUUID();
const probeCode = `const c=require('node:child_process'),f=require('node:fs'),h=require('node:crypto');const run=(p,a)=>c.execFileSync(p,a,{encoding:'utf8',timeout:10000}).trim();console.log(JSON.stringify({node:process.version,hyperframes:run(process.execPath,['/opt/agent-city-videoops/node_modules/hyperframes/bin/hyperframes.mjs','--version']),ffmpeg:run('ffmpeg',['-version']).split('\\n')[0],ffprobe:run('ffprobe',['-version']).split('\\n')[0],chromium:run('chromium',['--version']),workerSha256:h.createHash('sha256').update(f.readFileSync('/opt/agent-city-videoops/render.mjs')).digest('hex')}));`;
let probe: any;
try {
  probe = JSON.parse(
    await run(
      [
        "run",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--pids-limit",
        "128",
        "--memory",
        "512m",
        "--cpus",
        "1",
        "--entrypoint",
        "node",
        image,
        "-e",
        probeCode,
      ],
      60000,
    ),
  );
} finally {
  await run(["rm", "--force", name]);
}
const expectedWorker = createHash("sha256")
  .update(await readFile(resolve(root, "installer/videoops/render.mjs")))
  .digest("hex");
if (
  !probe.node.startsWith("v24.") ||
  !probe.hyperframes.includes("0.8.141") ||
  probe.workerSha256 !== expectedWorker ||
  !probe.ffprobe.startsWith("ffprobe version") ||
  !probe.ffmpeg.startsWith("ffmpeg version") ||
  !probe.chromium.startsWith("Chromium")
)
  throw Error("Selected image does not match the pinned VideoOps toolchain");
const catalog = await importCatalog(resolve(root, "../kujo-agents"));
const profile = (stage: string) => {
  const found = catalog.profiles.find(
    (p) => p.id === "kujolang/kujo-agents:videoops." + stage,
  );
  if (!found) throw Error("Missing role " + stage);
  return found;
};
const runtimeCaps = [
  "filesystem",
  "repository",
  "media-inspection",
  "hyperframes",
  "ffmpeg",
];
const operatorCaps = ["coding", "structured-output", "long-context"];
const evidenceName = "videoops-setup-" + randomUUID() + ".json";
const capabilities: VideoopsCapabilityEvidence[] = [
  ...runtimeCaps.map((capability) => ({
    capability,
    evidenceRef: evidenceName + ":verified-local-runtime",
    authority: "runtime" as const,
  })),
  ...operatorCaps.map((capability) => ({
    capability,
    evidenceRef: evidenceName + ":explicit-model-capability-attestation",
    authority: "operator" as const,
  })),
];
await mkdir(runtime, { recursive: true, mode: 0o700 });
await writeFile(
  resolve(runtime, "videoops-setup-evidence.json"),
  JSON.stringify(
    {
      schema: "agent-city.videoops-setup.v1",
      image,
      dockerContext: context,
      probe,
      model: { endpoint: model.endpoint, model: model.model },
      modelQualification: "OPERATOR_ATTESTED_NOT_AUTOMATICALLY_PROVEN",
      checkedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
await writeFile(
  resolve(runtime, evidenceName),
  await readFile(resolve(runtime, "videoops-setup-evidence.json")),
  { mode: 0o600, flag: "wx" },
);
await saveVideoopsSettings(runtime, {
  image,
  dockerContext: context,
  modelBinding: { endpoint: model.endpoint, model: model.model },
  planner: profile("creative-director"),
  scout: profile("asset-scout"),
  editor: profile("hyperframes-editor"),
  capabilities: {
    planner: capabilities,
    scout: capabilities,
    editor: capabilities,
  },
});
console.log(
  "VideoOps setup saved for " +
    runtime +
    ". Restart City normally. Render consent and independent review remain required for each task. No model task was executed.",
);
