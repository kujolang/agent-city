import { createHash } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  registerVideoopsMediaPack,
  type VideoopsMediaPack,
} from "./videoops-media-pack";

const fileLimit = 4 * 1024 * 1024;
const totalLimit = 12 * 1024 * 1024;
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function boundedText(v: unknown, bytes: number): v is string {
  return typeof v === "string" && !!v.trim() && Buffer.byteLength(v) <= bytes;
}
/** Caller enforces local authentication/origin and an HTTP request-body bound.
 * Files are supplied bytes, never resolved URLs/host paths. Rights are operator
 * attestations and uploaded imagery is not evidence of a current live operation. */
export async function registerUploadedVideoopsPack(options: {
  registryRoot: string;
  input: unknown;
}) {
  const input = options.input;
  if (
    !record(input) ||
    Object.keys(input).some(
      (k) => !["name", "styleIntake", "rights", "assets"].includes(k),
    ) ||
    !boundedText(input.name, 120) ||
    !boundedText(input.styleIntake, 7800) ||
    !boundedText(input.rights, 900) ||
    !Array.isArray(input.assets) ||
    !input.assets.length ||
    input.assets.length > 8
  )
    throw Error("Invalid uploaded media pack");
  const seen = new Set<string>(),
    files: { path: string; bytes: Buffer }[] = [];
  const assets: VideoopsMediaPack["assets"] = [];
  let total = 0;
  for (const raw of input.assets) {
    if (
      !record(raw) ||
      Object.keys(raw).some(
        (k) =>
          ![
            "name",
            "description",
            "dataBase64",
            "audioRole",
            "durationSeconds",
          ].includes(k),
      ) ||
      typeof raw.name !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}\.(png|jpg|jpeg|webp|mp4|webm|mp3|wav|ogg|m4a|ttf|woff|woff2)$/.test(
        raw.name,
      ) ||
      seen.has(raw.name.toLowerCase()) ||
      !boundedText(raw.description, 1024) ||
      typeof raw.dataBase64 !== "string" ||
      !raw.dataBase64.length ||
      raw.dataBase64.length > 4 * Math.ceil(fileLimit / 3) ||
      raw.dataBase64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(raw.dataBase64)
    )
      throw Error("Invalid uploaded media asset");
    const bytes = Buffer.from(raw.dataBase64, "base64");
    total += bytes.length;
    if (
      !bytes.length ||
      bytes.length > fileLimit ||
      total > totalLimit ||
      bytes.toString("base64") !== raw.dataBase64
    )
      throw Error("Uploaded media byte budget or base64 mismatch");
    seen.add(raw.name.toLowerCase());
    const audio = /\.(mp3|wav|ogg|m4a)$/.test(raw.name),
      font = /\.(ttf|woff2?)$/.test(raw.name);
    const path =
      "assets/" + (audio ? "audio/" : font ? "fonts/" : "captured/") + raw.name;
    if (
      (raw.audioRole !== undefined &&
        !["voice", "music", "sfx"].includes(raw.audioRole as string)) ||
      (audio &&
        (raw.audioRole === undefined || raw.durationSeconds === undefined)) ||
      (!audio && raw.audioRole !== undefined) ||
      (raw.durationSeconds !== undefined &&
        (typeof raw.durationSeconds !== "number" ||
          !Number.isFinite(raw.durationSeconds) ||
          raw.durationSeconds <= 0 ||
          raw.durationSeconds > 600))
    )
      throw Error(
        "Uploaded audio requires an explicit role and bounded duration",
      );
    const asset: VideoopsMediaPack["assets"][number] = {
      id: "upload-" + (assets.length + 1),
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      description: raw.description,
      rightsEvidence: "Operator-attested upload rights: " + input.rights,
      sourceType: "approved-local",
    };
    if (raw.audioRole !== undefined)
      asset.audioRole = raw.audioRole as "voice" | "music" | "sfx";
    if (raw.durationSeconds !== undefined)
      asset.durationSeconds = raw.durationSeconds as number;
    assets.push(asset);
    files.push({ path, bytes });
  }
  const manifest: VideoopsMediaPack = {
    schema: "agent-city.videoops-media-pack.v1",
    name: input.name,
    styleIntake:
      input.styleIntake +
      "\nUploaded reference media; provenance and rights are operator-attested. Do not present imagery as evidence of a current live operation.",
    assets,
    licenses: [],
  };
  await mkdir(options.registryRoot, { recursive: true, mode: 0o700 });
  const registryRoot = await realpath(options.registryRoot),
    staging = await mkdtemp(resolve(registryRoot, ".upload-"));
  try {
    for (const file of files) {
      const target = resolve(staging, file.path);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, file.bytes, { flag: "wx", mode: 0o600 });
    }
    return await registerVideoopsMediaPack({
      registryRoot,
      sourceRoot: staging,
      manifest,
    });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
