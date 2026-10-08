import { readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { localRuntime } from "./local-ports";
import { validateMediaProvider } from "../apps/runner/videoops-generation";
import { readVideoopsLaunchConfig } from "../apps/runner/videoops-mission";
import { saveVideoopsSettings } from "../apps/runner/videoops-settings";
const root = resolve(import.meta.dirname, ".."),
  runtime = localRuntime(root),
  args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--config") {
  console.log(
    "Usage: setup:videoops-provider --config PRIVATE_JSON_FILE\nSaves secret references and operator-evidenced capability/allowance scope only. Does not contact ElevenLabs or grant generation. Each mission still needs exact text, spending limits and explicit consent. See docs/videoops-media.md.",
  );
  process.exit(args.length ? 1 : 0);
}
const file = resolve(args[1]),
  info = await lstat(file);
if (!info.isFile() || info.size > 32768 || (info.mode & 0o077) !== 0)
  throw Error("Bounded private provider config file required (chmod 600)");
const provider = validateMediaProvider(
  JSON.parse(await readFile(file, "utf8")),
);
const config = await readVideoopsLaunchConfig(
  resolve(runtime, "videoops-config.json"),
);
await saveVideoopsSettings(runtime, { ...config, mediaProvider: provider });
console.log(
  "Private provider references saved. No provider request or secret disclosure occurred. Restart City; generation requires per-request authorization.",
);
