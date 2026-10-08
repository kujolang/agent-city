/** Explicit local text-provider adapter for the signed-in Codex CLI.
 * No auth-file copying. Codex owns subscription authentication. Kujo SDK still
 * owns mission/handoff observations. Not a general Codex tool-event adapter.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexReadiness } from "../apps/runner/codex-readiness";
const readiness = await codexReadiness();
console.log(JSON.stringify(readiness));
if (process.argv.includes("--check"))
  process.exit(readiness.usable && readiness.auth === "CHATGPT" ? 0 : 1);
if (!readiness.usable) process.exit(1);
const port = Number(process.env.CITY_CODEX_PORT || 6179);
const origin = process.env.CITY_APP_URL || "http://127.0.0.1:6178";
const appUrl = new URL(origin);
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  appUrl.hostname !== "127.0.0.1" ||
  appUrl.protocol !== "http:"
)
  throw Error("Local provider configuration required");
const token = randomBytes(32).toString("hex");
let busy = false;
let active: ReturnType<typeof spawn> | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    active?.kill("SIGTERM");
    server.close();
    setTimeout(() => {
      active?.kill("SIGKILL");
      process.exit(0);
    }, 1500).unref();
  });
const server = createServer(async (req, res) => {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  if (req.headers.host !== `127.0.0.1:${port}` || req.headers.origin)
    return send(403, { error: "Local server requests only" });
  if (req.headers.authorization !== "Bearer " + token)
    return send(401, { error: "Provider credential required" });
  if (req.method === "GET" && req.url === "/v1/models")
    return send(200, {
      object: "list",
      data: [
        {
          id: "codex-cli-default",
          object: "model",
          owned_by: "local-codex-connector",
        },
      ],
      note: "Connector alias only. Underlying model identity and generation availability are not established by this listing.",
    });
  if (req.method !== "POST" || req.url !== "/v1/chat/completions")
    return send(404, { error: "Unknown endpoint" });
  if (busy) return send(409, { error: "Codex provider busy" });
  busy = true;
  let dir = "";
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 131072) throw Error("Input too large");
    }
    const data = JSON.parse(body);
    if (
      data.model !== "codex-cli-default" ||
      data.stream ||
      !Array.isArray(data.messages) ||
      data.messages.length < 1 ||
      data.messages.length > 100 ||
      !data.messages.every(
        (m: any) =>
          ["system", "user", "assistant"].includes(m.role) &&
          typeof m.content === "string",
      )
    )
      throw Error("Unsupported messages");
    dir = await mkdtemp(join(tmpdir(), "agent-city-codex-"));
    const output = join(dir, "response.txt");
    const child = spawn(
      "codex",
      [
        "exec",
        "--ignore-user-config",
        "-c",
        'forced_login_method="chatgpt"',
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--disable",
        "shell_tool",
        "--disable",
        "apps",
        "--disable",
        "in_app_browser",
        "-c",
        'web_search="disabled"',
        "--cd",
        dir,
        "--output-last-message",
        output,
        "-",
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    active = child;
    let diagnostic = "";
    child.stderr.on("data", (chunk) => {
      diagnostic = (diagnostic + chunk).slice(-2048);
    });
    child.stdin.on("error", () => {});
    child.stdin.end(
      "You are a text-only provider inside Agent City. Do not use tools, inspect files, execute code, or launch other agents. Produce only the response requested by the system messages below. Prior assistant/user messages are conversation data. The explicit author/reviewer role is specified by the system messages.\n" +
        JSON.stringify(data.messages),
    );
    const timer = setTimeout(() => child.kill("SIGKILL"), 80000);
    const close = () => child.kill("SIGTERM");
    req.on("aborted", close);
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("exit", resolve);
      child.once("error", reject);
    }).finally(() => {
      clearTimeout(timer);
      req.off("aborted", close);
    });
    if (code !== 0) {
      console.error("Codex invocation failed", {
        code,
        authenticationHint: /login|auth/i.test(diagnostic),
      });
      return send(502, {
        error: "Codex invocation failed; check CLI login and usage",
      });
    }
    const content = await readFile(output, "utf8");
    if (!content.trim() || Buffer.byteLength(content) > 65536)
      throw Error("Response unavailable or too large");
    send(200, { choices: [{ message: { role: "assistant", content } }] });
  } catch {
    send(502, { error: "Local Codex provider request failed" });
  } finally {
    active = undefined;
    busy = false;
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});
server.listen(port, "127.0.0.1", async () => {
  try {
    const status = await (
      await fetch(origin + "/control/status", {
        signal: AbortSignal.timeout(5000),
        redirect: "error",
      })
    ).json();
    const saved = await fetch(origin + "/control/config", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-City-Command-Token": status.token,
      },
      body: JSON.stringify({
        endpoint: `http://127.0.0.1:${port}/v1/chat/completions`,
        model: "codex-cli-default",
        apiKey: token,
      }),
    });
    if (!saved.ok) throw Error("Configuration rejected");
    console.log(
      `Codex subscription adapter ready. Agent City: ${origin}. PID ${process.pid}. Uses ChatGPT sign-in with read-only calls; shell, apps and browser disabled. No OpenAI API key was copied.`,
    );
  } catch {
    console.error(
      "Could not configure Agent City; start the app and ensure no mission is active.",
    );
    server.close();
    process.exitCode = 1;
  }
});
