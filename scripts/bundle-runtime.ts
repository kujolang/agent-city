import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { verifyBundle } from "./bundle-integrity";

/** Reuse an explicitly selected local preview, never the active Kujo checkout. */
export async function verifiedRuntime(root: string) {
  const manifestBytes = await readFile(resolve(root, "bundle-manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.platform !== process.platform || manifest.arch !== process.arch)
    throw Error("Runtime preview platform/architecture mismatch");
  if (
    !/^[0-9a-f]{40}$/.test(manifest.sources?.kujo ?? "") ||
    typeof manifest.runtime?.version !== "string"
  )
    throw Error("Runtime preview provenance missing");
  const binaryMember = "kujo/target/release/kujo",
    licenseMember = "kujo/LICENSE";
  if (
    !manifest.files?.[binaryMember] ||
    !manifest.files?.[licenseMember] ||
    manifest.runtime.sha256 !== manifest.files[binaryMember].sha256
  )
    throw Error(
      "Runtime preview hash/license declaration missing or inconsistent",
    );
  await verifyBundle(root);
  // Read once and verify the buffers actually copied, not just a prior path read.
  const binary = await readFile(resolve(root, binaryMember));
  const license = await readFile(resolve(root, licenseMember));
  for (const [name, data] of [
    [binaryMember, binary],
    [licenseMember, license],
  ] as const)
    if (
      createHash("sha256").update(data).digest("hex") !==
      manifest.files[name].sha256
    )
      throw Error("Runtime preview changed during selection");
  return {
    binary,
    license,
    source: manifest.sources.kujo as string,
    version: manifest.runtime.version as string,
    sha256: manifest.runtime.sha256 as string,
    manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
  };
}
