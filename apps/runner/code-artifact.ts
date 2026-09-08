import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

export function unwrapCode(text: string) {
  const match = /^\s*```(?:javascript|js|mjs)?\s*\n([\s\S]*?)\n```\s*$/.exec(
    text,
  );
  return {
    content: match ? match[1] + "\n" : text,
    fenceRemoved: Boolean(match),
  };
}

/** Parse only: never import, evaluate, or execute generated JavaScript. */
export async function checkCodeArtifact(file: string) {
  const { content, fenceRemoved } = unwrapCode(await readFile(file, "utf8"));
  if (fenceRemoved) await writeFile(file, content, { mode: 0o600 });
  const syntax = await new Promise<"valid" | "invalid" | "unavailable">(
    (resolve) => {
      const child = spawn(process.execPath, ["--check", file], {
        env: {},
        stdio: "ignore",
        timeout: 5000,
      });
      child.once("error", () => resolve("unavailable"));
      child.once("exit", (code, signal) =>
        resolve(signal ? "unavailable" : code === 0 ? "valid" : "invalid"),
      );
    },
  );
  return {
    schema: "agent-city.code-check.v1",
    syntax,
    fenceRemoved,
    functionalTests: "not-run",
    codeExecuted: false,
    checkedAt: new Date().toISOString(),
  };
}
