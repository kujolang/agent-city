import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium, type Browser } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { portAvailable } from "./startup-checks";
import { packagedMissions } from "./packaged-missions";
import { localPorts, localRuntime } from "./local-ports";
const root = resolve(import.meta.dirname, "..");
assert(process.argv[2], "Provide the extracted bundle directory");
const bundle = resolve(process.argv[2]),
  app = resolve(bundle, "agent-city");
const manifest = JSON.parse(
  await readFile(resolve(bundle, "bundle-manifest.json"), "utf8"),
);
const ports = localPorts({ CITY_PORT_OFFSET: "30000" }),
  url = `http://127.0.0.1:${ports.web}`;
const real = process.env.CITY_LAUNCHER_REAL === "1";
const out = resolve(
  root,
  real ? "evidence/packaged-missions" : "evidence/launcher",
);
await mkdir(out, { recursive: true });
const originalPorts = await Promise.all(
  [5178, 7792, 7793].map(async (port) => ({
    port,
    available: await portAvailable(port),
  })),
);
const child = spawn(process.execPath, ["--import", "tsx", "scripts/start.ts"], {
  cwd: app,
  env: {
    ...process.env,
    CITY_PORT_OFFSET: "30000",
    CITY_PORT: String(ports.gateway),
    CITY_CONTROL_PORT: String(ports.control),
    KUJO_BIN: resolve(bundle, "kujo/target/release/kujo"),
    CITY_MODEL_ENDPOINT: "",
    CITY_MODEL: "",
    CITY_MODEL_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "",
  browser: Browser | undefined;
child.stdout.on("data", (b) => (log = (log + b).slice(-8000)));
child.stderr.on("data", (b) => (log = (log + b).slice(-8000)));
const started = Date.now();
const deadline = setTimeout(
  () => {
    child.kill("SIGTERM");
    void browser?.close();
    console.error("Launcher diagnostic timed out");
    setTimeout(() => process.exit(1), 3000);
  },
  real ? 480000 : 180000,
);
deadline.unref();
try {
  while (!log.includes("Agent City ready:")) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw Error("Launcher stopped before ready: " + log);
    await new Promise((r) => setTimeout(r, 200));
  }
  const readinessMs = Date.now() - started;
  const status = await (await fetch(url + "/control/status")).json();
  assert.equal(status.configured, false);
  assert.equal(status.busy, false);
  assert.equal(status.jobs.length, 0);
  const snapshot = await (await fetch(url + "/api/world/snapshot")).json();
  assert.equal(Object.keys(snapshot.truth.agents).length, 0);
  const authorizedInvalid = await fetch(url + "/control/config", {
    method: "POST",
    headers: {
      origin: url,
      "content-type": "application/json",
      "x-city-command-token": status.token,
    },
    body: "{}",
  });
  assert.equal(
    authorizedInvalid.status,
    400,
    "Correct offset origin should reach config validation",
  );
  const foreign = await fetch(url + "/control/config", {
    method: "POST",
    headers: {
      origin: "http://example.invalid",
      "content-type": "application/json",
      "x-city-command-token": status.token,
    },
    body: "{}",
  });
  assert.equal(foreign.status, 403);
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector("canvas");
  await page.waitForFunction(
    () => (window as any).agentCity?.rendererReady === true,
  );
  await page.screenshot({
    path: resolve(out, "fresh-stack.png"),
    fullPage: true,
  });
  const missions = real ? await packagedMissions(page, url, out) : null;
  assert.deepEqual(errors, []);
  const pids = JSON.parse(
    await readFile(
      resolve(localRuntime(app, { CITY_PORT_OFFSET: "30000" }), "pids.json"),
      "utf8",
    ),
  );
  await browser.close();
  browser = undefined;
  child.kill("SIGTERM");
  for (
    let i = 0;
    i < 100 && child.exitCode === null && child.signalCode === null;
    i++
  )
    await new Promise((r) => setTimeout(r, 100));
  assert.equal(
    child.exitCode,
    0,
    "Launcher should forward shutdown and reap local supervisor",
  );
  const released = await Promise.all(
    Object.entries(ports).map(async ([service, port]) => ({
      service,
      port,
      available: await portAvailable(port),
    })),
  );
  assert(
    released.every((p) => p.available),
    "Owned service ports must close on launcher shutdown",
  );
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: real
          ? "Fresh packaged stack with real local-model writing/code missions"
          : "Fresh packaged full stack startup/shutdown; no model execution",
        missions,
        source: manifest.sources["agent-city"],
        ports,
        readinessMs,
        services: Object.keys(pids),
        emptyTruth: true,
        modelConfigured: false,
        offsetOriginValidation: true,
        foreignOriginRejected: true,
        rendererReady: true,
        errors,
        exitCode: child.exitCode,
        released,
        originalPorts,
        originalPortsAfter: await Promise.all(
          originalPorts.map(async ({ port }) => ({
            port,
            available: await portAvailable(port),
          })),
        ),
        at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "Fresh packaged stack, offset-origin controls, canvas and shutdown: PASS",
  );
} finally {
  child.kill("SIGTERM");
  await browser?.close();
  clearTimeout(deadline);
}
