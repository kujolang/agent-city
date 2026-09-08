import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { resolve, sep } from "node:path";
export async function verifyBundle(root: string) {
  const manifest = JSON.parse(
    await readFile(resolve(root, "bundle-manifest.json"), "utf8"),
  );
  if (
    manifest.schema !== "agent-city.local-bundle.v1" ||
    !manifest.files ||
    typeof manifest.files !== "object"
  )
    throw Error("Unsupported bundle manifest");
  let checked = 0;
  for (const [name, entry] of Object.entries(manifest.files) as [
    string,
    { sha256: string; bytes: number },
  ][]) {
    if (
      name.split(/[\\/]/).some((p) => p === ".." || p === ".") ||
      name.includes("\\")
    )
      throw Error("Invalid bundle member path");
    const path = resolve(root, name);
    if (!path.startsWith(resolve(root) + sep))
      throw Error("Bundle member escapes root");
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw Error(`Non-file bundle member: ${name}`);
    const data = await readFile(path);
    if (
      data.length !== entry.bytes ||
      createHash("sha256").update(data).digest("hex") !== entry.sha256
    )
      throw Error(`Bundle integrity mismatch: ${name}`);
    checked++;
  }
  if (!checked) throw Error("Empty bundle manifest");
  return {
    checked,
    platform: manifest.platform,
    arch: manifest.arch,
    status: manifest.status,
  };
}
