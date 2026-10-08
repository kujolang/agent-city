/** Actual installed CLI and connector, controlled fresh City configuration endpoint.
 * No prompt, account change, auth-file access, or source mission. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import assert from "node:assert/strict";
import { codexReadiness } from "../apps/runner/codex-readiness";
const readiness = await codexReadiness();
assert(readiness.usable, readiness.message);
let config: any;
let writes = 0;
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/control/status" && req.method === "GET")
    return res.end(JSON.stringify({ token: "controlled-city-token" }));
  if (
    req.url === "/control/config" &&
    req.method === "POST" &&
    req.headers["x-city-command-token"] === "controlled-city-token" &&
    req.headers.origin === "http://127.0.0.1:18896"
  ) {
    let body = "";
    for await (const chunk of req) body += chunk;
    config = JSON.parse(body);
    writes++;
    return res.end("{}");
  }
  res.statusCode = 404;
  res.end("{}");
});
server.listen(18896, "127.0.0.1");
await once(server, "listening");
const child = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/codex-provider.ts"],
  {
    env: {
      ...process.env,
      CITY_APP_URL: "",
      CITY_PORT_OFFSET: "13718",
      CITY_CODEX_PORT: "18897",
    },
    stdio: "ignore",
  },
);
const exited = once(child, "exit");
try {
  const deadline = Date.now() + 20000;
  while (!config && Date.now() < deadline && child.exitCode === null)
    await new Promise((resolve) => setTimeout(resolve, 100));
  assert(config, "Connector must configure the fresh controlled endpoint");
  assert.equal(writes, 1);
  assert.equal(config.model, "codex-cli-default");
  const url = "http://127.0.0.1:18897/v1/models";
  const headers = { Authorization: "Bearer " + config.apiKey };
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (
      await fetch(url, {
        headers: { ...headers, Origin: "http://127.0.0.1:18896" },
      })
    ).status,
    403,
  );
  const listing = await fetch(url, { headers });
  assert.equal(listing.status, 200);
  const data = await listing.json();
  assert.equal(data.data[0].id, "codex-cli-default");
  assert(data.note.includes("Underlying model identity"));
  await mkdir("evidence/codex-onboarding", { recursive: true });
  await writeFile(
    "evidence/codex-onboarding/proof.json",
    JSON.stringify(
      {
        scope:
          "Actual installed CLI/connector with controlled fresh City config endpoint; no generation or account signup",
        readiness,
        alias: config.model,
        authenticatedListing: true,
        unauthenticatedRejected: true,
        browserOriginRejected: true,
        configurationWrites: writes,
        appTarget:
          "derived from the same CITY_PORT_OFFSET as the normal launcher",
        modelCalls: 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: actual connector metadata and configuration; no model call",
  );
} finally {
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 2000);
  await exited;
  clearTimeout(timer);
  server.close();
  await once(server, "close");
}
