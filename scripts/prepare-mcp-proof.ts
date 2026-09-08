import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Isolated copy of the existing MCP demo; no producer source edits. */
export async function prepareMcpProof(
  dir: string,
  port: number,
  token: string,
) {
  const source = resolve(import.meta.dirname, "../../mcp");
  await mkdir(resolve(dir, "demo/docs"), { recursive: true, mode: 0o700 });
  await cp(resolve(source, "src"), resolve(dir, "src"), { recursive: true });
  await cp(resolve(source, "server.kujo"), resolve(dir, "server.kujo"));
  await cp(
    resolve(source, "demo/docs/README.md"),
    resolve(dir, "demo/docs/README.md"),
  );
  const config = JSON.parse(
    await readFile(resolve(source, "mcp-server.json"), "utf8"),
  );
  config.http.port = port;
  config.http.host = "127.0.0.1";
  config.auth = { enabled: true, type: "bearer", token };
  await writeFile(resolve(dir, "mcp-server.json"), JSON.stringify(config), {
    mode: 0o600,
  });
  return dir;
}
