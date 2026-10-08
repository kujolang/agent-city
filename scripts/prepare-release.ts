/** Build pinned distribution assets only; never tags, publishes, or reads runtime state. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
).version;
if (!/^\d+\.\d+\.\d+-rc\.\d+$/.test(version))
  throw Error(
    "This builder only publishes explicitly labeled preview candidates",
  );
const git = async (args: string[]) =>
  (await exec("git", args, { cwd: root })).stdout.trim();
if (await git(["status", "--porcelain", "--untracked-files=no"]))
  throw Error(
    "Commit tracked changes before preparing immutable release assets",
  );
const commit = await git(["rev-parse", "HEAD"]);
if (!/^[a-f0-9]{40}$/.test(commit)) throw Error("Invalid source commit");
const tag = "v" + version;
const dir = resolve(root, ".runtime/releases", tag, commit);
await mkdir(dir, { recursive: true });
const digest = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
const bootstrap = await readFile(resolve(root, "install.sh"));
const wrapper = `#!/bin/sh
# Agent City ${tag}: pinned local preview, not universal workflow certification.
set -eu
scratch=$(mktemp -d "\${TMPDIR:-/tmp}/agent-city-release.XXXXXXXX")
trap 'rm -rf "$scratch"' EXIT HUP INT TERM
curl --proto '=https' --tlsv1.2 -fsSL --max-time 60 'https://raw.githubusercontent.com/kujolang/agent-city/${commit}/install.sh' -o "$scratch/install.sh"
if command -v shasum >/dev/null 2>&1; then actual=$(shasum -a 256 "$scratch/install.sh" | cut -d ' ' -f 1); else actual=$(sha256sum "$scratch/install.sh" | cut -d ' ' -f 1); fi
[ "$actual" = '${digest(bootstrap)}' ] || { echo 'Pinned bootstrap checksum mismatch' >&2; exit 1; }
CITY_INSTALL_REF='${commit}'; export CITY_INSTALL_REF
sh "$scratch/install.sh" "$@"
`;
await writeFile(resolve(dir, "install.sh"), wrapper, { mode: 0o755 });
await exec("sh", ["-n", resolve(dir, "install.sh")]);
const archive = `agent-city-${version}-source.tar.gz`;
await exec(
  "git",
  [
    "archive",
    "--format=tar.gz",
    `--prefix=agent-city-${version}/`,
    `--output=${resolve(dir, archive)}`,
    commit,
  ],
  { cwd: root },
);
const sources = JSON.parse(
  await readFile(resolve(root, "installer/sources.json"), "utf8"),
);
const files: Record<string, { sha256: string; bytes: number }> = {};
for (const name of ["install.sh", archive]) {
  const b = await readFile(resolve(dir, name));
  files[name] = { sha256: digest(b), bytes: b.length };
}
const manifest = {
  schema: "agent-city.public-preview.v1",
  version,
  tag,
  commit,
  platforms: ["darwin-x64", "darwin-arm64", "linux-x64", "linux-arm64"],
  distribution:
    "Pinned network installer and source archive; provider account/model and Docker are separate",
  sources,
  files,
  limits: [
    "Local preview, not public multi-tenant hosting",
    "WebOps/VideoOps executable team adapters remain incomplete",
    "No eight-hour soak or OS sleep qualification",
    "Checksums establish integrity, not publisher signing",
  ],
};
await writeFile(
  resolve(dir, "release-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
const manifestBytes = await readFile(resolve(dir, "release-manifest.json"));
await writeFile(
  resolve(dir, "SHA256SUMS"),
  [
    ...Object.entries(files).map(([name, v]) => `${v.sha256}  ${name}`),
    `${digest(manifestBytes)}  release-manifest.json`,
  ].join("\n") + "\n",
);
console.log(JSON.stringify({ tag, commit, dir, files }));
