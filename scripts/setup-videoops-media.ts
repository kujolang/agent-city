import { readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { registerVideoopsMediaPack } from "../apps/runner/videoops-media-pack";
import { localRuntime } from "./local-ports";
const root = resolve(import.meta.dirname, ".."),
  args = process.argv.slice(2),
  values: Record<string, string> = {};
for (let i = 0; i < args.length; i += 2) {
  if (
    !["--builtin", "--source", "--manifest", "--registry"].includes(args[i]) ||
    !args[i + 1] ||
    args[i + 1].startsWith("--") ||
    values[args[i]]
  )
    throw Error(
      "Usage: setup-videoops-media --builtin pixel-v2 | --source DIR --manifest FILE [--registry DIR]",
    );
  values[args[i]] = args[i + 1];
}
if (
  (values["--builtin"] !== undefined &&
    (values["--builtin"] !== "pixel-v2" ||
      values["--source"] ||
      values["--manifest"])) ||
  (!values["--builtin"] && (!values["--source"] || !values["--manifest"]))
)
  throw Error(
    "Choose builtin pixel-v2 or an explicit local source and manifest",
  );
const sourceRoot = values["--builtin"]
  ? resolve(root, "assets/videoops/pixel-v2")
  : resolve(values["--source"]);
const manifestPath = values["--builtin"]
  ? resolve(sourceRoot, "pack.json")
  : resolve(values["--manifest"]);
const st = await lstat(manifestPath);
if (!st.isFile() || st.size > 196608)
  throw Error("Manifest must be a bounded regular file");
const result = await registerVideoopsMediaPack({
  sourceRoot,
  manifest: JSON.parse(await readFile(manifestPath, "utf8")),
  registryRoot: resolve(
    values["--registry"] || resolve(localRuntime(root), "videoops-media-packs"),
  ),
});
console.log(
  JSON.stringify(
    {
      packId: result.packId,
      name: result.manifest.name,
      assets: result.manifest.assets.length,
      note: "Local immutable media registered; no generation or publication authorized.",
    },
    null,
    2,
  ),
);
