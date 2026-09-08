import { validateModelConfig, type ModelConfig } from "./config";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

// Local business entry point, deliberately separate from the read-only projection.
const root = resolve(import.meta.dirname, "../..");
const dir = resolve(
  process.env.CITY_CONTROL_DIR || resolve(root, ".runtime/control"),
);
await mkdir(dir, { recursive: true, mode: 0o700 });
const token = randomBytes(32).toString("hex");
const origin = process.env.CITY_WEB_ORIGIN || "http://127.0.0.1:5178";
const port = Number(process.env.CITY_CONTROL_PORT || 7793);
type Job = {
  id: string;
  kind: "writing" | "code";
  status: "running" | "completed" | "failed" | "unknown";
  startedAt: string;
  finishedAt?: string;
};
let jobs: Job[] = [];
try {
  jobs = JSON.parse(await readFile(resolve(dir, "jobs.json"), "utf8"));
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
for (const job of jobs) if (job.status === "running") job.status = "unknown";
async function save() {
  await writeFile(resolve(dir, "jobs.tmp"), JSON.stringify(jobs), {
    mode: 0o600,
  });
  await rename(resolve(dir, "jobs.tmp"), resolve(dir, "jobs.json"));
}
await save();
let active: ChildProcess | null = null;
let submitting = false;
let config: ModelConfig | null = null;
try {
  config = validateModelConfig(
    JSON.parse(await readFile(resolve(dir, "model.json"), "utf8")),
  );
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
if (!config && process.env.CITY_MODEL_ENDPOINT && process.env.CITY_MODEL)
  config = validateModelConfig({
    endpoint: process.env.CITY_MODEL_ENDPOINT,
    model: process.env.CITY_MODEL,
    apiKey: process.env.CITY_MODEL_API_KEY || "",
  });
const configured = () => Boolean(config);
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (
    ![new URL(origin).host, `127.0.0.1:${port}`, `localhost:${port}`].includes(
      req.headers.host || "",
    ) ||
    (req.headers.origin && req.headers.origin !== origin)
  )
    return send(403, { error: "Local origin required" });
  try {
    if (req.method === "GET" && req.url === "/control/status")
      return send(200, {
        configured: configured(),
        model: config?.model || null,
        endpoint: config?.endpoint || "",
        hasCredential: Boolean(config?.apiKey),
        token,
        busy: Boolean(active) || submitting,
        jobs,
      });
    if (req.method === "GET" && req.url?.startsWith("/control/artifact/")) {
      const id = req.url.slice("/control/artifact/".length);
      const job = jobs.find((j) => j.id === id && j.status === "completed");
      if (!job) return send(404, { error: "Completed mission not found" });
      const file = resolve(
        root,
        ".runtime/missions",
        job.id,
        job.kind === "code" ? "reviewed.mjs" : "reviewed.md",
      );
      return send(200, {
        id,
        kind: job.kind,
        content: await readFile(file, "utf8"),
        codeExecuted: false,
      });
    }
    if (
      req.method !== "POST" ||
      !["/control/missions", "/control/config"].includes(req.url || "")
    )
      return send(404, { error: "Not found" });
    if (
      req.headers.origin !== origin ||
      req.headers["x-city-command-token"] !== token ||
      !req.headers["content-type"]?.startsWith("application/json")
    )
      return send(403, { error: "Explicit local command token required" });
    if (active || submitting)
      return send(409, { error: "One mission is already running" });
    submitting = true;
    let body = "";
    try {
      for await (const bytes of req) {
        body += bytes;
        if (Buffer.byteLength(body) > 20_000)
          return send(413, { error: "Task too large" });
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return send(400, { error: "Invalid JSON" });
      }
      if (req.url === "/control/config") {
        let next;
        try {
          next = validateModelConfig({
            ...data,
            apiKey:
              data?.apiKey ||
              (data?.endpoint === config?.endpoint ? config?.apiKey || "" : ""),
          });
        } catch {
          return send(400, {
            error:
              "Provide a valid model endpoint and model. Use HTTPS or local HTTP; no credentials in the URL.",
          });
        }
        await writeFile(resolve(dir, "model.tmp"), JSON.stringify(next), {
          mode: 0o600,
        });
        await rename(resolve(dir, "model.tmp"), resolve(dir, "model.json"));
        config = next;
        return send(200, { configured: true });
      }
      if (!configured())
        return send(503, {
          error: "Configure a model before submitting a mission",
        });
      if (
        !data ||
        typeof data !== "object" ||
        !["writing", "code"].includes(data.kind) ||
        typeof data.prompt !== "string" ||
        !data.prompt.trim() ||
        Buffer.byteLength(data.prompt) > 16_384
      )
        return send(400, {
          error: "Choose writing/code and provide a task up to 16 KiB",
        });
      const id = "mission-" + randomUUID();
      const prompt = resolve(dir, id + ".txt");
      await writeFile(prompt, data.prompt, { mode: 0o600 });
      const job: Job = {
        id,
        kind: data.kind,
        status: "running",
        startedAt: new Date().toISOString(),
      };
      jobs = [job, ...jobs].slice(0, 100);
      await save();
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/mission.ts", data.kind, prompt],
        {
          cwd: root,
          env: {
            ...process.env,
            CITY_MISSION_ID: id,
            CITY_MODEL_ENDPOINT: config!.endpoint,
            CITY_MODEL: config!.model,
            CITY_MODEL_API_KEY: config!.apiKey,
          },
          stdio: "ignore",
        },
      );
      active = child;
      let finalized = false;
      const finish = async (status: Job["status"]) => {
        if (finalized) return;
        finalized = true;
        job.status = status;
        job.finishedAt = new Date().toISOString();
        await save();
        active = null;
      };
      child.once("error", () => {
        void finish("failed").catch(() => {
          active = null;
        });
      });
      child.once("exit", (code) => {
        void finish(code === 0 ? "completed" : "failed").catch(() => {
          active = null;
        });
      });
      return send(202, { id, status: job.status });
    } finally {
      submitting = false;
    }
  } catch {
    if (!res.headersSent)
      send(500, {
        error: "Local mission service could not complete the request",
      });
  }
});
server.requestTimeout = 10_000;
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Local mission service: ${port}; model ${configured() ? "configured" : "not configured"}`,
  ),
);
function stop() {
  active?.kill("SIGTERM");
  server.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
