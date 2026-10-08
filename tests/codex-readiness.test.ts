import { test, expect } from "vitest";
import { codexReadiness } from "../apps/runner/codex-readiness";
import type { boundedCommand } from "../apps/runner/bounded-command";
const help =
  "--ignore-user-config --ephemeral --sandbox --skip-git-repo-check --disable --cd --output-last-message";
const privateText = "PRIVATE-CLI-DIAGNOSTIC";
test("readiness separates missing CLI, unsupported options and bounded authentication states without copying diagnostics", async () => {
  for (const [mode, auth, usable] of [
    ["missing", "UNKNOWN", false],
    ["old", "UNKNOWN", false],
    ["signed-out", "SIGNED_OUT", false],
    ["api", "API_KEY", false],
    ["chatgpt", "CHATGPT", true],
    ["config-error", "UNKNOWN", true],
    ["timeout", "UNKNOWN", true],
  ] as const) {
    const calls: string[][] = [];
    const run: typeof boundedCommand = async (exe, args, options) => {
      expect(exe).toBe("codex");
      expect(options.timeoutMs).toBe(5000);
      calls.push(args);
      if (args[0] === "--version")
        return {
          code: mode === "missing" ? null : 0,
          timedOut: false,
          output: mode === "missing" ? privateText : "codex-cli 0.144.4",
        };
      if (args[0] === "exec")
        return {
          code: 0,
          timedOut: false,
          output: mode === "old" ? privateText : help,
        };
      return {
        code: ["chatgpt", "api"].includes(mode) ? 0 : 1,
        timedOut: mode === "timeout",
        output:
          mode === "chatgpt"
            ? "Logged in using ChatGPT"
            : mode === "api"
              ? "Logged in using an API key: " + privateText
              : mode === "signed-out"
                ? "Not logged in"
                : privateText,
      };
    };
    const result = await codexReadiness(run);
    expect(result).toMatchObject({ auth, usable });
    expect(JSON.stringify(result)).not.toContain(privateText);
    expect(
      calls.every(
        (args) =>
          args.join(" ") === "--version" ||
          args.join(" ") === "exec --help" ||
          args.join(" ") === "login status",
      ),
    ).toBe(true);
  }
});
