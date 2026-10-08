import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { validateVideoopsArtifacts } from "./videoops-artifacts";
export function validateVideoopsRenderInput(value: unknown) {
  const v = value as any;
  if (
    !v ||
    v.schema !== "agent-city.videoops-render-input.v1" ||
    Object.keys(v).some(
      (k) =>
        ![
          "schema",
          "composition",
          "width",
          "height",
          "fps",
          "durationSeconds",
        ].includes(k),
    ) ||
    ![24, 25, 30, 50, 60].includes(v.fps) ||
    !Number.isInteger(v.width) ||
    v.width < 256 ||
    v.width > 1920 ||
    !Number.isInteger(v.height) ||
    v.height < 240 ||
    v.height > 1920 ||
    v.width * v.height > 2073600 ||
    !Number.isFinite(v.durationSeconds) ||
    v.durationSeconds <= 0 ||
    v.durationSeconds > 60 ||
    !Number.isInteger(v.durationSeconds * v.fps)
  )
    throw Error("Invalid bounded VideoOps render request");
  const composition = validateVideoopsArtifacts(
    "hyperframes-editor",
    v.composition,
  );
  if (composition.files.some((f) => f.path.endsWith("/gsap.min.js")))
    throw Error("GSAP is supplied by the immutable runtime");
  return {
    schema: "agent-city.videoops-render.v1",
    composition,
    width: v.width,
    height: v.height,
    fps: v.fps,
    durationSeconds: v.durationSeconds,
  };
}
/** Only the fresh private Workcell source repo is an authorized target. */
export async function stageVideoopsRender(source: string, value: unknown) {
  const input = validateVideoopsRenderInput(value);
  // Workcell source is invocation-owned and initially contains only the generated
  // README/git metadata. An exclusive root prevents merging with prior tasks.
  await mkdir(resolve(source, "production"), { mode: 0o700 });
  for (const file of input.composition.files) {
    const target = resolve(source, file.path);
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, file.content, { mode: 0o600, flag: "wx" });
  }
  const { composition, ...request } = input;
  await writeFile(
    resolve(source, "render-request.json"),
    JSON.stringify(request),
    { mode: 0o600, flag: "wx" },
  );
  return request;
}
