import {
  mkdir,
  cp,
  readFile,
  writeFile,
  rename,
  lstat,
  rm,
  chmod,
  mkdtemp,
} from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function options(args) {
  let prefix = join(homedir(), ".local", "share", "agent-city"),
    start = true;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prefix" && args[i + 1]) prefix = resolve(args[++i]);
    else if (args[i] === "--no-start") start = false;
    else throw Error("Usage: install.sh [--prefix DIRECTORY] [--no-start]");
  }
  return { prefix: resolve(prefix), start };
}
export function command(executable, args, cwd, timeout = 300_000) {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
      },
      timeout,
    });
    child.once("error", fail);
    child.once("exit", (code, signal) =>
      code === 0
        ? done()
        : fail(Error(`${executable} exited ${code ?? signal}`)),
    );
  });
}
export async function validateArchive(archive, execute) {
  const names = await execute("tar", ["-tzf", archive]);
  const details = await execute("tar", ["-tvzf", archive]);
  if (
    details
      .trim()
      .split("\n")
      .some((line) => !["-", "d"].includes(line[0]))
  )
    throw Error("Source archive links or special files are not allowed");
  const paths = names.trim().split("\n");
  if (
    !paths.length ||
    paths.some(
      (p) =>
        p.startsWith("/") || p.includes("\\") || p.split("/").includes(".."),
    )
  )
    throw Error("Unsafe source archive paths");
  const top = paths[0].split("/")[0];
  if (paths.some((p) => p.split("/")[0] !== top))
    throw Error("Source archive must have one root");
}
async function output(executable, args) {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    let result = "";
    child.stdout.on("data", (b) => {
      result += b;
      if (result.length > 4_000_000) child.kill();
    });
    child.once("error", fail);
    child.once("exit", (code) =>
      code === 0
        ? done(result)
        : fail(Error("Source archive inspection failed")),
    );
  });
}
async function download(url, path) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok)
    throw Error(`Source download failed: ${response.status} ${url}`);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 128 * 1024 * 1024)
      throw Error("Source archive exceeds install limit");
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  await writeFile(path, data);
  return createHash("sha256").update(data).digest("hex");
}
export async function install({ prefix, start }) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw Error(
      "Node 24+ required; use install.sh to prepare a private Node runtime",
    );
  if (
    !["darwin", "linux"].includes(process.platform) ||
    !["x64", "arm64"].includes(process.arch)
  )
    throw Error("Unqualified installer platform");
  try {
    await lstat(prefix);
    throw Error(
      "Destination already exists; choose a new --prefix. Existing installs and missions are never overwritten.",
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const lock = JSON.parse(
    await readFile(join(source, "installer/sources.json"), "utf8"),
  );
  if (
    lock.schema !== "agent-city.install-sources.v1" ||
    Object.keys(lock.repositories).length !== 6
  )
    throw Error("Invalid source lock");
  await mkdir(dirname(prefix), { recursive: true });
  const stage = await mkdtemp(join(dirname(prefix), ".agent-city-staging-"));
  let installed = false;
  try {
    const app = join(stage, "agent-city");
    await mkdir(app);
    for (const item of [
      "apps",
      "packages",
      "assets",
      "scripts",
      "integrations",
      "installer",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "LICENSE",
      "README.md",
      "Start Agent City.command",
    ])
      await cp(join(source, item), join(app, item), { recursive: true });
    const archives = {};
    for (const [repo, sha] of Object.entries(lock.repositories)) {
      if (!/^[a-z-]+$/.test(repo) || !/^[a-f0-9]{40}$/.test(sha))
        throw Error("Invalid repository pin");
      console.log(`Installing ${repo} @ ${sha.slice(0, 12)}`);
      const archive = join(stage, repo + ".tar.gz");
      archives[repo] = await download(
        `https://codeload.github.com/kujolang/${repo}/tar.gz/${sha}`,
        archive,
      );
      await validateArchive(archive, output);
      const dir = join(stage, repo);
      await mkdir(dir);
      await command(
        "tar",
        ["-xzf", archive, "--strip-components=1", "-C", dir],
        stage,
      );
      await rm(archive);
    }
    await command(
      "npm",
      ["ci", "--ignore-scripts"],
      join(app, "installer/runtime"),
    );
    const require = createRequire(join(app, "installer/runtime/package.json"));
    const runtime = require("@kujolang/kujo-runtime");
    const binary = runtime.resolveKujoBinary();
    const binaryDir = join(stage, "kujo/target/release");
    await mkdir(binaryDir, { recursive: true });
    await cp(binary, join(binaryDir, "kujo"));
    await chmod(join(binaryDir, "kujo"), 0o755);
    await command(join(binaryDir, "kujo"), ["--version"], stage);
    await command("npm", ["ci"], app);
    await command("npm", ["run", "build"], app);
    // Prepare a managed Node copy only when bootstrap had to supply Node.
    if (process.env.CITY_BOOTSTRAP_NODE_DIR)
      await cp(process.env.CITY_BOOTSTRAP_NODE_DIR, join(stage, ".node"), {
        recursive: true,
      });
    await writeFile(
      join(stage, "start.command"),
      '#!/bin/sh\nset -eu\ncd "$(dirname "$0")"\nif [ -x .node/bin/node ]; then PATH="$PWD/.node/bin:$PATH"; export PATH; fi\ncd agent-city\nexec npm start\n',
      { mode: 0o755 },
    );
    await writeFile(
      join(stage, "install-receipt.json"),
      JSON.stringify(
        {
          schema: "agent-city.install.v1",
          cityRevision:
            process.env.CITY_INSTALL_REF || "local-source-unqualified",
          sources: lock,
          archiveSha256: archives,
          runtimeSha256: createHash("sha256")
            .update(await readFile(binary))
            .digest("hex"),
          platform: process.platform,
          arch: process.arch,
          installedAt: new Date().toISOString(),
          qualification: "PREVIEW: release gates incomplete",
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    await rename(stage, prefix);
    installed = true;
    console.log(
      `Installed Agent City at ${prefix}\nStart: ${join(prefix, "start.command")}\nConfigure your model in Mission Command. No credentials or existing missions were imported.`,
    );
    if (start) await command("sh", [join(prefix, "start.command")], prefix, 0);
  } finally {
    if (!installed) await rm(stage, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  install(options(process.argv.slice(2))).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
