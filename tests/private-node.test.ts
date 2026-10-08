import { test, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  readlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
// @ts-expect-error standalone installer JavaScript
import { copyPrivateNode } from "../installer/private-node.mjs";
for (const legacy of [false, true])
  test(`private npm survives removed bootstrap source (legacy=${legacy})`, async () => {
    const root = await mkdtemp(join(tmpdir(), "city-node-copy-"));
    const source = join(root, "bootstrap"),
      destination = join(root, "installed");
    try {
      await mkdir(join(source, "bin"), { recursive: true });
      await mkdir(join(source, "lib/node_modules/npm/bin"), {
        recursive: true,
      });
      for (const command of ["npm", "npx"]) {
        await writeFile(
          join(source, "lib/node_modules/npm/bin", command + "-cli.js"),
          `console.log(${JSON.stringify(command)});\n`,
        );
        await symlink(
          legacy
            ? join(root, "deleted-bootstrap/bin", command)
            : "../lib/node_modules/npm/bin/" + command + "-cli.js",
          join(source, "bin", command),
        );
      }
      await copyPrivateNode(source, destination);
      await rm(source, { recursive: true });
      for (const command of ["npm", "npx"]) {
        const link = join(destination, "bin", command);
        expect(await readlink(link)).toBe(
          "../lib/node_modules/npm/bin/" + command + "-cli.js",
        );
        const result = spawnSync(process.execPath, [link], {
          encoding: "utf8",
        });
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe(command);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
