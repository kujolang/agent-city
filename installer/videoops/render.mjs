/** Trusted fixed container entry point. Composition code never selects commands. */
import { readFile, writeFile, mkdir, copyFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const root = "/workspace";
const project = resolve(root, "production/hyperframes");
const output = resolve(root, "output");
await mkdir(output, { recursive: true });
await mkdir("/tmp/city-videoops", { recursive: true });
const request = JSON.parse(await readFile(resolve(root, "render-request.json"), "utf8"));
if (request.schema !== "agent-city.videoops-render.v1" ||
    ![24, 25, 30, 50, 60].includes(request.fps) ||
    !Number.isInteger(request.width) || request.width < 256 || request.width > 1920 ||
    !Number.isInteger(request.height) || request.height < 240 || request.height > 1920 ||
    request.width * request.height > 2073600 ||
    !Number.isFinite(request.durationSeconds) || request.durationSeconds <= 0 || request.durationSeconds > 60 ||
    !Number.isInteger(request.durationSeconds * request.fps))
  throw Error("Invalid bounded render request");
const cli = "/opt/agent-city-videoops/node_modules/hyperframes/bin/hyperframes.mjs";
await copyFile("/opt/agent-city-videoops/node_modules/gsap/dist/gsap.min.js", resolve(project, "gsap.min.js"));
const steps = [];
function run(name, executable, args, timeout) {
  const started = Date.now();
  try {
    const stdout = execFileSync(executable, args, { cwd: project, timeout, maxBuffer: 2097152, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    steps.push({ name, status: "passed", durationMs: Date.now() - started });
    return stdout;
  } catch (error) {
    steps.push({ name, status: "failed", durationMs: Date.now() - started });
    throw Error(name + " failed: " + String(error.stderr || error.message).slice(-8192));
  }
}
try {
  const version = run("version", process.execPath, [cli, "--version"], 10000).trim();
  // check includes lint. A failed gate cannot be converted into a render success.
  const check = run("check", process.execPath, [cli, "check", project, "--json"], 60000);
  await writeFile(resolve(output, "check.json"), check);
  run("render", process.execPath, [cli, "render", project, "--output", resolve(output, "draft.mp4"), "--fps", String(request.fps), "--quality", "draft", "--workers", "1", "--low-memory-mode"], 180000);
  const probe = JSON.parse(run("probe", "ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", resolve(output, "draft.mp4")], 15000));
  const video = probe.streams?.find(s => s.codec_type === "video");
  const rational = String(video?.avg_frame_rate || "0/1").split("/").map(Number);
  if (!video || video.width !== request.width || video.height !== request.height ||
      rational[0] / rational[1] !== request.fps ||
      Math.abs(Number(probe.format.duration) - request.durationSeconds) > 1 / request.fps + 0.001)
    throw Error("Rendered dimensions, frame rate or duration disagree with request");
  run("decode", "ffmpeg", ["-v", "error", "-xerror", "-i", resolve(output, "draft.mp4"), "-f", "null", "-"], 30000);
  const file = resolve(output, "draft.mp4");
  if ((await stat(file)).size > 33554432) throw Error("Render exceeds export limit");
  const bytes = await readFile(file);
  await writeFile(resolve(output, "metadata.json"), JSON.stringify({
    schema: "agent-city.videoops-render-receipt.v1", status: "passed",
    hyperframesVersion: version, request, probe, steps,
    artifact: { path: "output/draft.mp4", bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") },
    technical: "passed", perceptual: "NOT_REVIEWED", publication: "NOT_PERFORMED",
  }, null, 2));
} catch (error) {
  await writeFile(resolve(output, "render-failure.json"), JSON.stringify({ status: "failed", steps, reason: String(error).slice(-8192) }));
  throw error;
}
