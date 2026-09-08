import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdir,
  readFile,
  writeFile,
  cp,
  readdir,
  lstat,
  rm,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, relative } from "node:path";
const exec = promisify(execFile),
  root = resolve(import.meta.dirname, "..");
const git = async (dir: string, args: string[]) =>
  (
    await exec("git", args, { cwd: dir, maxBuffer: 16 * 1024 * 1024 })
  ).stdout.trim();
const hash = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
const names = [
  "agent-city",
  "agents-sdk",
  "dispatch",
  "watchdog",
  "rag",
  "eval",
  "mcp",
];
const sourcePaths = [
  "apps",
  "packages",
  "assets",
  "scripts",
  "integrations",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "LICENSE",
  "README.md",
  "TRY-AGENT-CITY.md",
  "Start Agent City.command",
];
const revisions: Record<string, string> = {};
for (const name of [...names, "kujo"]) {
  const dir = resolve(root, "..", name);
  if (await git(dir, ["status", "--porcelain", "--untracked-files=no"]))
    throw Error(
      `Commit or isolate tracked changes in ${name} before packaging. No repository was modified.`,
    );
  revisions[name] = await git(dir, ["rev-parse", "HEAD"]);
}
const name = `agent-city-preview-${process.platform}-${process.arch}-${revisions["agent-city"].slice(0, 12)}`;
const output = resolve(root, ".runtime/bundles");
await mkdir(output, { recursive: true });
const stage = join(output, name);
await mkdir(stage); // Refuse to overwrite any existing artifact.
try {
  for (const repo of names) {
    const archive = join(stage, `${repo}.tar`);
    await exec(
      "git",
      [
        "archive",
        "--format=tar",
        `--output=${archive}`,
        revisions[repo],
        ...(repo === "agent-city" ? sourcePaths : []),
      ],
      { cwd: resolve(root, "..", repo) },
    );
    const dest = join(stage, repo);
    await mkdir(dest);
    await exec("tar", ["-xf", archive, "-C", dest]);
    await rm(archive);
  }
  // Exclude runtime/private locations even if a producer accidentally tracked them.
  async function sanitize(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink())
        throw Error(
          `Bundle source contains a symlink: ${relative(stage, path)}; review before distribution`,
        );
      if (
        /^(\.env(?:\..*)?|\.runtime|\.git|\.tmp|\.strata-tmp|node_modules|watchdog_proxy_config\.json|test-results)$/.test(
          entry.name,
        ) ||
        /\.(sqlite(?:-wal|-shm)?|db(?:-wal|-shm)?|log)$/.test(entry.name)
      )
        await rm(path, { recursive: true, force: true });
      else if (entry.isDirectory()) await sanitize(path);
    }
  }
  await sanitize(stage);
  const runtime = join(stage, "kujo/target/release");
  await mkdir(runtime, { recursive: true });
  const binary = resolve(root, "../kujo/target/release/kujo");
  await cp(binary, join(runtime, "kujo"));
  await cp(resolve(root, "../kujo/LICENSE"), join(stage, "kujo/LICENSE"));
  const version = (await exec(binary, ["--version"])).stdout.trim();
  await writeFile(
    join(stage, "START-HERE.md"),
    `# Agent City local preview\n\nNot a qualified production release. Built for ${process.platform}/${process.arch}.\n\n1. Install Node 24 or newer.\n2. Open agent-city/Start Agent City.command on macOS, or run npm ci then npm start from agent-city.\n3. Open http://127.0.0.1:5178 and configure your model in Mission Command. No model credentials or prior missions are included.\n4. For isolated JavaScript function checks, install Chromium with npx playwright install chromium from agent-city if it is not already installed.\n\nProducer source and the local Kujo binary are included. npm dependencies are installed from package-lock.json on first use; this requires npm registry access/cache. A local or compatible remote model is separate. Use npm run doctor to inspect startup prerequisites and occupied ports. Existing processes are never stopped by preflight.\n\nAfter npm ci, run npm run verify:bundle from agent-city to check manifest content hashes (integrity, not publisher authentication).\n\nSee agent-city/TRY-AGENT-CITY.md for writing, coding and follow-up examples. Open gates include reference fidelity, throughput/reliability and release qualification. No eight-hour soak was run for this bundle.\n`,
  );
  const files: Record<string, { sha256: string; bytes: number }> = {};
  async function inventory(dir: string) {
    for (const name of (await readdir(dir)).sort()) {
      const path = join(dir, name),
        info = await lstat(path);
      if (info.isDirectory()) await inventory(path);
      else {
        const bytes = await readFile(path);
        files[relative(stage, path)] = {
          sha256: hash(bytes),
          bytes: bytes.length,
        };
      }
    }
  }
  await inventory(stage);
  const manifest = {
    schema: "agent-city.local-bundle.v1",
    status: "PREVIEW / RELEASE GATES INCOMPLETE",
    platform: process.platform,
    arch: process.arch,
    node: ">=24",
    sources: revisions,
    runtime: {
      version,
      sha256: hash(await readFile(binary)),
      sourceCorrespondence:
        "Source revision recorded separately; binary build provenance not attested",
    },
    files,
  };
  await writeFile(
    join(stage, "bundle-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  const archive = stage + ".tar.gz";
  await exec("tar", ["-czf", archive, "-C", output, name], {
    maxBuffer: 1024 * 1024,
  });
  const receipt = {
    directory: stage,
    archive,
    sha256: hash(await readFile(archive)),
    bytes: (await lstat(archive)).size,
    files: Object.keys(files).length,
    sources: revisions,
    status: manifest.status,
  };
  await writeFile(archive + ".receipt.json", JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  // Keep the failed staging directory for inspection; never publish an incomplete archive as success.
  console.error(`Packaging failed; inspect staging directory ${stage}`);
  throw error;
}
