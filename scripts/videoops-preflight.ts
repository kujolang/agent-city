import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectVideoopsNative } from "../apps/runner/videoops-native";
const root = resolve(import.meta.dirname, "..");
const workspace = resolve(
  process.env.CITY_VIDEOOPS_WORKSPACE ||
    resolve(root, ".runtime/videoops-preflight"),
);
await mkdir(workspace, { recursive: true, mode: 0o700 });
const receipts = [];
for (const operation of [
  "media.doctor",
  "media.providers",
  "review.status",
] as const)
  receipts.push(
    await inspectVideoopsNative({
      agentsRepository: resolve(root, "../kujo-agents"),
      workspace,
      operation,
    }),
  );
const receipt = {
  schema: "agent-city.videoops-preflight.v1",
  inspectedAt: new Date().toISOString(),
  scope:
    "Actual local native-tool inspections, not rendering or production qualification",
  receipts,
};
await writeFile(
  resolve(workspace, "city-preflight.json"),
  JSON.stringify(receipt, null, 2) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    results: receipts.map((r) => ({
      operation: r.operation,
      status: r.status,
      reason: r.reason,
    })),
    receipt: resolve(workspace, "city-preflight.json"),
  }),
);
if (
  receipts
    .filter((r) => r.operation !== "review.status")
    .some((r) => r.status !== "observed")
)
  process.exitCode = 1;
