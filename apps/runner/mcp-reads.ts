/** Explicit per-mission reads through the operator's local MCP server. */
export function validateMcpReads(
  value: unknown,
  enabled = process.env.CITY_ENABLE_MCP_READS === "1",
): string[] {
  if (value === undefined || (Array.isArray(value) && value.length === 0))
    return [];
  if (!enabled)
    throw Error("Local MCP source reads are not enabled by this installation.");
  if (!Array.isArray(value) || value.length > 3)
    throw Error("Choose at most three MCP source files.");
  const seen = new Set<string>();
  return value.map((path) => {
    if (
      typeof path !== "string" ||
      path.length > 160 ||
      !/^[a-zA-Z0-9_-][a-zA-Z0-9_./-]*$/.test(path) ||
      path.split("/").some((part) => !part || part.startsWith("."))
    )
      throw Error(
        "MCP reads require relative file names without hidden or parent paths.",
      );
    const key = path.toLowerCase();
    if (seen.has(key)) throw Error("Duplicate MCP source file.");
    seen.add(key);
    return path;
  });
}

export function localMcpReadEndpoint(
  value = process.env.CITY_MCP_URL || "http://127.0.0.1:8931/mcp/v1",
): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/mcp/v1"
  )
    throw Error(
      "MCP source reads require the operator's loopback /mcp/v1 endpoint.",
    );
  return url.href.replace(/\/$/, "");
}
