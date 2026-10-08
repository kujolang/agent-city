import {
  mkdtemp,
  readFile,
  copyFile,
  rm,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { boundedCommand } from "../apps/runner/bounded-command";
const root = resolve(import.meta.dirname, "..");
const image = "agent-city-kujo:1.7.0";
if (process.argv.slice(2).join(" ") !== "--build") {
  console.log(
    "Usage: npm run setup:workcell -- --build\nBuilds a local Kujo image using the selected Docker engine/context. Downloads the pinned base and integrity-locked Kujo runtime. Does not install/start an engine, publish an image, change your context or enable mission execution.",
  );
  process.exit(process.argv.length > 2 ? 1 : 0);
}
const engine = await boundedCommand(
  "docker",
  ["info", "--format", "{{json .}}"],
  { cwd: root, timeoutMs: 5000, graceMs: 500 },
);
if (engine.code !== 0 || engine.timedOut)
  throw Error(
    "Docker is unavailable. Start your engine and select its context before building the local image.",
  );
const stage = await mkdtemp(join(tmpdir(), "city-workcell-image-"));
try {
  const hashes: Record<string, string> = {};
  for (const [source, name] of [
    ["installer/workcell/Dockerfile", "Dockerfile"],
    ["installer/runtime/package.json", "package.json"],
    ["installer/runtime/package-lock.json", "package-lock.json"],
  ]) {
    const path = resolve(root, source);
    await copyFile(path, join(stage, name));
    hashes[name] = createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
  }
  console.log(
    "Building " + image + " from the pinned recipe (maximum 10 minutes)…",
  );
  const built = await boundedCommand(
    "docker",
    ["build", "--tag", image, stage],
    { cwd: root, timeoutMs: 600_000, graceMs: 5000 },
  );
  if (built.code !== 0 || built.timedOut) {
    console.error(built.output);
    throw Error(
      "Local image build failed or timed out. No execution was enabled. Check the selected engine and registry connectivity, then retry.",
    );
  }
  const inspected = await boundedCommand(
    "docker",
    ["image", "inspect", "--format", "{{.Id}}", image],
    { cwd: root, timeoutMs: 5000, graceMs: 500 },
  );
  const id = inspected.output.trim();
  if (
    inspected.code !== 0 ||
    inspected.timedOut ||
    !/^sha256:[a-f0-9]{64}$/.test(id)
  )
    throw Error(
      "Built image identity could not be established; execution remains disabled.",
    );
  const runtime = resolve(
    process.env.CITY_RUNTIME_DIR || resolve(root, ".runtime"),
  );
  await mkdir(runtime, { recursive: true, mode: 0o700 });
  await writeFile(
    resolve(runtime, "workcell-image.json"),
    JSON.stringify(
      {
        schema: "agent-city.workcell-image.v1",
        image,
        imageId: id,
        recipeSha256: hashes,
        builtAt: new Date().toISOString(),
        scope:
          "Local build and build-time Kujo version check; no workload or backend security qualification",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  const launcher = process.env.CITY_MANAGED_LAUNCHER;
  const launchCommand = launcher
    ? "'" + launcher.replaceAll("'", "'\\''") + "'"
    : "npm start";
  console.log(
    `Local image built: ${id}\nTo explicitly enable Workcell for your next launch:\nCITY_ENABLE_WORKCELL=1 CITY_WORKCELL_IMAGE=${id} ${launchCommand}\nKeep the same Docker context. Each mission still requires its own execution opt-in.`,
  );
} finally {
  await rm(stage, { recursive: true, force: true });
}
