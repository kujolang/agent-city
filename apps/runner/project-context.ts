import { createHash } from "node:crypto";

/** User-selected source material, never a host path, mount, tool or write grant. */
export function projectContext(value: unknown) {
  if (value === undefined || (Array.isArray(value) && !value.length))
    return null;
  if (!Array.isArray(value) || value.length > 8)
    throw Error("Select at most eight text files");
  const names = new Set<string>();
  let total = 0;
  const files = value.map((file) => {
    if (
      !file ||
      typeof file.path !== "string" ||
      typeof file.content !== "string"
    )
      throw Error("Project files require a relative name and text content");
    const path = file.path;
    if (
      path.length > 160 ||
      !/^[a-zA-Z0-9_. -]+(?:\/[a-zA-Z0-9_. -]+)*$/.test(path) ||
      path
        .split("/")
        .some(
          (part: string) =>
            part === "." || part === ".." || part.trim() !== part,
        ) ||
      names.has(path.toLowerCase())
    )
      throw Error("Invalid or duplicate project file name");
    names.add(path.toLowerCase());
    const bytes = Buffer.byteLength(file.content);
    total += bytes;
    if (
      file.content.includes("\0") ||
      Buffer.from(file.content, "utf8").toString("utf8") !== file.content ||
      bytes > 16384 ||
      total > 32768
    )
      throw Error(
        "Project context requires text files up to 16 KiB each and 32 KiB total",
      );
    return {
      path,
      content: file.content,
      bytes,
      sha256: createHash("sha256").update(file.content).digest("hex"),
    };
  });
  return { schema: "agent-city.project-context.v1", files };
}
export function projectReferences(context: ReturnType<typeof projectContext>) {
  return (
    context?.files.map(({ path, bytes, sha256 }) => ({
      path,
      bytes,
      sha256,
    })) ?? []
  );
}
