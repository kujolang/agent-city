import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  realpath,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

/** Role-owned text artifacts only. This is storage, never render/review approval. */
export const videoopsOutputs = {
  "creative-director": [
    "planning/creative-brief.md",
    "planning/transcript.md",
    "planning/shot-list.json",
    "planning/style-plan.md",
    "planning/asset-requirements.json",
  ],
  "asset-scout": [
    "assets/asset-manifest.json",
    "assets/licenses.md",
    "assets/source-log.md",
  ],
  "hyperframes-editor": [
    "production/hyperframes/index.html",
    "production/production-notes.md",
  ],
  "video-critic": [
    "review/critique.md",
    "review/approval.json",
    "review/fix-list.json",
  ],
} as const;
export type VideoopsStage = keyof typeof videoopsOutputs;
export interface VideoopsArtifactBundle {
  schema: "agent-city.videoops-artifacts.v1";
  files: { path: string; content: string }[];
}
export function validateVideoopsArtifacts(
  stage: VideoopsStage,
  value: unknown,
) {
  if (!Object.hasOwn(videoopsOutputs, stage))
    throw Error("Unknown VideoOps stage");
  const bundle = value as VideoopsArtifactBundle;
  if (
    !bundle ||
    bundle.schema !== "agent-city.videoops-artifacts.v1" ||
    Object.keys(bundle).some((k) => !["schema", "files"].includes(k)) ||
    !Array.isArray(bundle.files) ||
    bundle.files.length > 32
  )
    throw Error("Invalid VideoOps artifact bundle");
  const required = videoopsOutputs[stage] as readonly string[];
  const paths = new Set<string>();
  let bytes = 0;
  for (const file of bundle.files) {
    if (
      !file ||
      Object.keys(file).some((k) => !["path", "content"].includes(k)) ||
      typeof file.path !== "string" ||
      typeof file.content !== "string" ||
      !file.content.trim() ||
      file.content.includes("\0")
    )
      throw Error("Invalid VideoOps text artifact");
    // Only Editor may add local composition sources. No package lifecycle scripts,
    // binaries, host paths, role-crossing writes or encoded path separators.
    const editorSource =
      stage === "hyperframes-editor" &&
      /^production\/hyperframes\/[a-zA-Z0-9_-]+\.(html|css|js|json)$/.test(
        file.path,
      ) &&
      !file.path.endsWith("/package.json");
    if (
      (!required.includes(file.path) && !editorSource) ||
      paths.has(file.path)
    )
      throw Error(
        "Duplicate or non-owned VideoOps artifact path: " +
          file.path.slice(0, 180),
      );
    const size = Buffer.byteLength(file.content);
    bytes += size;
    if (size > 131072 || bytes > 524288)
      throw Error("VideoOps artifact byte limit exceeded");
    if (file.path.endsWith(".json")) {
      try {
        JSON.parse(file.content);
      } catch {
        throw Error("Invalid VideoOps JSON artifact");
      }
    }
    paths.add(file.path);
  }
  if (!required.every((p) => paths.has(p)))
    throw Error("Required VideoOps artifacts missing");
  return structuredClone(bundle);
}

/** Check every existing component before writes. Parent symlinks are rejected. */
async function privateDirectory(root: string, relative: string) {
  let current = root;
  for (const part of relative.split("/").filter(Boolean)) {
    current = resolve(current, part);
    if (!current.startsWith(root + sep)) throw Error("Workspace escape");
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error: any) {
      if (error.code !== "EEXIST") throw error;
    }
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error("Unsafe VideoOps directory");
  }
  return current;
}

export async function saveVideoopsAttempt(options: {
  workspace: string;
  stage: VideoopsStage;
  attempt: number;
  execution: string;
  bundle: unknown;
}) {
  const bundle = validateVideoopsArtifacts(options.stage, options.bundle);
  if (
    !Number.isSafeInteger(options.attempt) ||
    options.attempt < 1 ||
    options.attempt > 100 ||
    !/^[a-zA-Z0-9_.:-]{1,256}$/.test(options.execution)
  )
    throw Error("Invalid VideoOps attempt identity");
  const root = await realpath(options.workspace);
  if (!(await lstat(root)).isDirectory())
    throw Error("Workspace must be a directory");
  const attempts = await privateDirectory(
    root,
    ".videoops/attempts/" + options.stage,
  );
  const final = resolve(attempts, String(options.attempt));
  // Exclusive reservation protects retries/concurrent writers. A failed write
  // remains a failed attempt; it is never reused or silently replaced.
  await mkdir(final, { mode: 0o700 });
  const pending = resolve(final, ".pending-" + randomUUID());
  await mkdir(pending, { mode: 0o700 });
  try {
    const artifacts = [];
    for (const file of bundle.files) {
      const folder = dirname(file.path);
      await privateDirectory(pending, folder === "." ? "" : folder);
      await writeFile(resolve(pending, file.path), file.content, {
        mode: 0o600,
        flag: "wx",
      });
      artifacts.push({
        path: file.path,
        bytes: Buffer.byteLength(file.content),
        sha256: createHash("sha256").update(file.content).digest("hex"),
      });
    }
    const receipt = {
      schema: "agent-city.videoops-artifact-receipt.v1",
      stage: options.stage,
      attempt: options.attempt,
      execution: options.execution,
      status: "stored",
      validation: "paths-bytes-json-only",
      productionApproval: "NOT_ESTABLISHED",
      artifacts,
    };
    await writeFile(
      resolve(pending, "receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    await rename(pending, resolve(final, "artifacts"));
    return { directory: resolve(final, "artifacts"), receipt };
  } catch (error) {
    await rm(pending, { recursive: true, force: true });
    await writeFile(
      resolve(final, "failed.json"),
      JSON.stringify({
        status: "failed",
        stage: options.stage,
        attempt: options.attempt,
        reason: "Artifact storage did not complete; attempt retained",
      }),
      { mode: 0o600, flag: "wx" },
    ).catch(() => {});
    throw error;
  }
}

/** Recheck stored bytes before downstream roles or execution consume them.
 * The receipt comes from runtime storage, never from the model or browser. */
export async function readVideoopsAttempt(
  stored: Awaited<ReturnType<typeof saveVideoopsAttempt>>,
) {
  const { directory, receipt } = stored;
  const root = await realpath(directory);
  if (
    root !== resolve(directory) ||
    receipt.status !== "stored" ||
    receipt.artifacts.length > 32
  )
    throw Error("Invalid stored VideoOps attempt");
  const files = [];
  for (const ref of receipt.artifacts) {
    const file = resolve(root, ref.path);
    if (
      !file.startsWith(root + sep) ||
      !Number.isSafeInteger(ref.bytes) ||
      ref.bytes < 1 ||
      ref.bytes > 131072
    )
      throw Error("Invalid stored artifact reference");
    const info = await lstat(file);
    if (
      !info.isFile() ||
      info.size !== ref.bytes ||
      (await realpath(file)) !== file
    )
      throw Error("Stored stage artifact changed");
    const bytes = await readFile(file);
    if (
      bytes.length !== ref.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== ref.sha256
    )
      throw Error("Stored stage artifact checksum changed");
    files.push({ path: ref.path, content: bytes.toString("utf8") });
  }
  return validateVideoopsArtifacts(receipt.stage, {
    schema: "agent-city.videoops-artifacts.v1",
    files,
  });
}
