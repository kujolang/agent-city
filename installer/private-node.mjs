import { cp, lstat, realpath, rm, symlink } from "node:fs/promises";
import { join, sep } from "node:path";

export async function copyPrivateNode(source, destination) {
  await cp(source, destination, { recursive: true, verbatimSymlinks: true });
  const root = await realpath(destination);
  const bin = join(root, "bin");
  if ((await realpath(bin)) !== bin || !(await lstat(bin)).isDirectory())
    throw Error("Private Node bin must be a real directory");
  // Repair legacy copies whose npm links point into deleted bootstrap staging.
  // Only the two known npm entrypoints in the new owned stage are replaced.
  for (const command of ["npm", "npx"]) {
    const target = join(root, "lib/node_modules/npm/bin", command + "-cli.js");
    if (
      !(await realpath(target)).startsWith(root + sep) ||
      !(await lstat(target)).isFile()
    )
      throw Error("Private Node is missing its bundled npm entrypoints");
    const link = join(bin, command);
    await rm(link, { force: true });
    await symlink("../lib/node_modules/npm/bin/" + command + "-cli.js", link);
  }
}
