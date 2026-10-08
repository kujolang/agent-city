import { boundedCommand } from "./bounded-command";

/** Read-only CLI metadata. Never signs in, reads auth files, or sends a prompt. */
export async function codexReadiness(
  run: typeof boundedCommand = boundedCommand,
) {
  const options = { cwd: process.cwd(), timeoutMs: 5000, graceMs: 500 };
  const version = await run("codex", ["--version"], options);
  const label =
    version.output.match(/^codex-cli ([0-9][0-9a-zA-Z.+-]{0,60})\s*$/m)?.[1] ??
    "UNKNOWN";
  if (version.code !== 0 || version.timedOut || version.spawnError)
    return {
      usable: false,
      version: label,
      auth: "UNKNOWN",
      message:
        "Codex CLI is unavailable. Install Codex CLI, then rerun provider:codex --check.",
    };
  const help = await run("codex", ["exec", "--help"], options);
  const flags = [
    "--ignore-user-config",
    "--ephemeral",
    "--sandbox",
    "--skip-git-repo-check",
    "--disable",
    "--cd",
    "--output-last-message",
  ];
  if (
    help.code !== 0 ||
    help.timedOut ||
    flags.some((flag) => !help.output.includes(flag))
  )
    return {
      usable: false,
      version: label,
      auth: "UNKNOWN",
      message:
        "Codex CLI lacks the required text-only execution options. Update Codex CLI, then rerun provider:codex --check.",
    };
  const login = await run("codex", ["login", "status"], options);
  // Match only known status lines, never return arbitrary CLI diagnostics/tokens.
  const output = login.output.trim();
  if (!login.timedOut && !login.spawnError) {
    if (login.code === 0 && /^Logged in using ChatGPT\s*$/im.test(output))
      return {
        usable: true,
        version: label,
        auth: "CHATGPT",
        message:
          "ChatGPT login is present. Usage and model access are checked by the actual request; no prompt was sent.",
      };
    if (/^Logged in using an? API key\b/im.test(output))
      return {
        usable: false,
        version: label,
        auth: "API_KEY",
        message:
          "This subscription connector requires ChatGPT sign-in. Use codex login to select ChatGPT, or configure an API provider separately in Agent City.",
      };
    if (/^Not logged in\s*$/im.test(output))
      return {
        usable: false,
        version: label,
        auth: "SIGNED_OUT",
        message:
          "Run codex login in your terminal, finish ChatGPT sign-in, then rerun provider:codex --check.",
      };
  }
  return {
    usable: true,
    version: label,
    auth: "UNKNOWN",
    message:
      "CLI execution options are available, but login status could not be verified. Run codex login status for local diagnostics. The connector ignores user config for execution; authentication remains unverified until a request succeeds.",
  };
}
