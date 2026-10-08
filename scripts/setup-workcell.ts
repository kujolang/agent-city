import { localRuntime } from "./local-ports";
import { saveWorkcellSettings } from "../apps/runner/workcell-settings";
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
const runtime = localRuntime(root);
const args = process.argv.slice(2);
const enable = args.includes("--enable");
const build = args.includes("--build");
const imageIndex = args.indexOf("--image");
const selectedImage = imageIndex >= 0 ? args[imageIndex + 1] : undefined;
if (args.length === 1 && args[0] === "--disable") {
  await saveWorkcellSettings(runtime, {
    schema: "agent-city.workcell-settings.v1",
    enabled: false,
  });
  console.log(
    "Saved Workcell execution disabled for the next launch. Restart City to apply; running work is not interrupted.",
  );
  process.exit(0);
}
const expected = [
  ...(build ? ["--build"] : []),
  ...(enable ? ["--enable"] : []),
  ...(selectedImage ? ["--image", selectedImage] : []),
];
if (
  (!build && !(selectedImage && enable)) ||
  (build && selectedImage) ||
  args.length !== expected.length ||
  args.some((arg) => !expected.includes(arg)) ||
  (selectedImage &&
    (selectedImage.startsWith("-") || selectedImage.length > 256))
) {
  console.log(
    "Usage: setup:workcell --build [--enable] | --image LOCAL_IMAGE --enable | --disable\nBuilds the pinned local image or selects an existing one. --enable saves its immutable ID and current Docker context for this City's next launch. Does not install/start Docker or change its default context. Every mission still requires explicit execution consent.",
  );
  process.exit(args.length ? 1 : 0);
}
if (enable && process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT)
  throw Error(
    "To save setup, select a named Docker context instead of DOCKER_HOST. No settings changed.",
  );
if (enable) {
  const definition = JSON.parse(
    await readFile(resolve(root, "../workcell/workcell.json"), "utf8"),
  );
  if (definition?.runtime?.backend !== "docker")
    throw Error(
      "Saved setup supports the Docker Workcell backend. Keep manual configuration for other backends.",
    );
}
const engine = await boundedCommand(
  "docker",
  ["info", "--format", "{{json .}}"],
  { cwd: root, timeoutMs: 5000, graceMs: 500 },
);
if (engine.code !== 0 || engine.timedOut)
  throw Error(
    engine.timedOut
      ? "Docker did not answer within 5 seconds. Check the selected engine/context and system load, then retry. No image build was started."
      : "Docker is unavailable. Start your engine and select its context before building the local image.",
  );
const stage = await mkdtemp(join(tmpdir(), "city-workcell-image-"));
try {
  const hashes: Record<string, string> = {};
  if (build) {
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
  }
  const inspected = await boundedCommand(
    "docker",
    ["image", "inspect", "--format", "{{.Id}}", selectedImage || image],
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
  await mkdir(runtime, { recursive: true, mode: 0o700 });
  if (build)
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
  if (enable) {
    const context = await boundedCommand("docker", ["context", "show"], {
      cwd: root,
      timeoutMs: 5000,
      graceMs: 500,
    });
    if (context.code !== 0 || context.timedOut || context.spawnError)
      throw Error(
        "Docker context could not be established; no execution setup saved.",
      );
    await saveWorkcellSettings(runtime, {
      schema: "agent-city.workcell-settings.v1",
      enabled: true,
      imageId: id,
      dockerContext: context.output.trim(),
    });
    console.log(
      `Saved local Workcell setup for ${runtime}. Image: ${id}. Restart City normally to apply. Each mission still requires its own execution opt-in.`,
    );
  }
  const launcher = process.env.CITY_MANAGED_LAUNCHER;
  const launchCommand = launcher
    ? "'" + launcher.replaceAll("'", "'\\''") + "'"
    : "npm start";
  if (!enable)
    console.log(
      `Local image built: ${id}\nTo explicitly enable Workcell for your next launch:\nCITY_ENABLE_WORKCELL=1 CITY_WORKCELL_IMAGE=${id} ${launchCommand}\nKeep the same Docker context. Each mission still requires its own execution opt-in.`,
    );
} finally {
  await rm(stage, { recursive: true, force: true });
}
