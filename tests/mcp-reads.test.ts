import { expect, test } from "vitest";
import {
  validateMcpReads,
  localMcpReadEndpoint,
} from "../apps/runner/mcp-reads";
test("MCP source grants are explicit bounded relative names", () => {
  expect(validateMcpReads(undefined, false)).toEqual([]);
  expect(validateMcpReads([], false)).toEqual([]);
  expect(() => validateMcpReads(["README.md"], false)).toThrow("enabled");
  expect(validateMcpReads(["src/tool.kujo", "README.md"], true)).toEqual([
    "src/tool.kujo",
    "README.md",
  ]);
  for (const value of [
    "README.md",
    ["a", "b", "c", "d"],
    ["../secret"],
    [".env"],
    ["src/.key"],
    ["/etc/passwd"],
    ["a\\b"],
    ["a//b"],
    ["a/"],
    ["a", "A"],
    ["a".repeat(161)],
    [42],
  ])
    expect(() => validateMcpReads(value, true)).toThrow();
});
test("MCP source endpoint cannot send credentials or file grants beyond the local server", () => {
  expect(localMcpReadEndpoint("http://127.0.0.1:8931/mcp/v1")).toBe(
    "http://127.0.0.1:8931/mcp/v1",
  );
  expect(localMcpReadEndpoint("http://[::1]:8931/mcp/v1")).toContain("[::1]");
  for (const endpoint of [
    "https://remote.example/mcp/v1",
    "http://localhost/mcp/v1",
    "http://user:pass@127.0.0.1/mcp/v1",
    "http://127.0.0.1/other",
    "http://127.0.0.1/mcp/v1?key=secret",
    "http://127.0.0.1/mcp/v1#x",
  ])
    expect(() => localMcpReadEndpoint(endpoint)).toThrow();
});
