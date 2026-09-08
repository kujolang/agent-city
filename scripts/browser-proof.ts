import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const root = resolve(import.meta.dirname, "..");
await mkdir(resolve(root, "evidence"), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: resolve(root, ".runtime/video"),
    size: { width: 1280, height: 1000 },
  },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5178");
await page.waitForSelector("canvas");
await page.screenshot({
  path: resolve(root, "evidence/01-city.png"),
  fullPage: true,
});
let release: () => void = () => {},
  arrived = false;
const barrier = new Promise<void>((r) => (release = r));
const proxy = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c);
  const response = await fetch("http://127.0.0.1:8791" + req.url, {
    method: req.method,
    headers: { "content-type": "application/json" },
    body: Buffer.concat(chunks),
  });
  const body = await response.text();
  arrived = true;
  await barrier;
  res.writeHead(response.status, { "content-type": "application/json" });
  res.end(body);
});
await new Promise<void>((r) => proxy.listen(8793, "127.0.0.1", r));
const producer =
    process.env.CITY_PRODUCER ||
    (process.env.CITY_SOURCE_PREFIX || "review-") + "retrieval-" + Date.now(),
  actor = "worker-1";
const child = spawn(
  process.env.KUJO_BIN || resolve(root, "../kujo/target/release/kujo"),
  ["run", "examples/agent_city_observer.kujo", "--interpreter"],
  {
    cwd: resolve(root, "../dispatch"),
    env: {
      ...process.env,
      RAG_URL: "http://127.0.0.1:8793",
      CITY_PRODUCER: producer,
      CITY_ACTOR: actor,
      CITY_SPOOL: resolve(root, `.runtime/spool-${producer}.jsonl`),
      CITY_SDK_ROOT: resolve(root, "../agents-sdk"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let proofPassed = false;
let output = "";
child.stdout.on("data", (d) => (output += d));
child.stderr.on("data", (d) => (output += d));
const completed = new Promise<number | null>((r) => child.on("exit", r));
try {
  await page.waitForFunction(
    (prefix) =>
      Object.keys((window as any).agentCity.truth.agents).some((id) =>
        id.startsWith(prefix),
      ),
    producer,
    { timeout: 20000 },
  );
  const id = await page.evaluate(
    (prefix) =>
      Object.keys((window as any).agentCity.truth.agents).find((id) =>
        id.startsWith(prefix),
      )!,
    producer,
  );
  await page.getByRole("button", { name: /DOCS/ }).last().click();
  await page.getByRole("button", { name: "Follow selected instance" }).click();
  await page.waitForFunction(
    (prefix) => {
      const s = (window as any).agentCity;
      const a = Object.values(s.truth.agents).find((a: any) =>
        a.id.startsWith(prefix),
      ) as any;
      return Object.values(a.operations).some(
        (o: any) => o.capability === "rag.query" && o.status === "active",
      );
    },
    producer,
    { timeout: 20000 },
  );
  for (let i = 0; i < 200 && !arrived; i++)
    await new Promise((r) => setTimeout(r, 50));
  assert(arrived, "actual RAG response must be held at barrier");
  await page.screenshot({
    path: resolve(root, "evidence/02-start-before-completion.png"),
    fullPage: true,
  });
  const before = await page.evaluate(() => (window as any).agentCity);
  assert.equal(before.truth.agents[id].status, "running");
  release();
  assert.equal(await completed, 0, output);
  await page.waitForFunction(
    (id) => (window as any).agentCity.truth.agents[id]?.status === "completed",
    id,
  );
  await page.waitForFunction((id) => {
    const s = (window as any).agentCity;
    return (
      s.presentation.walkers[id]?.scene === "library" && s.scene === "library"
    );
  }, id);
  await page.screenshot({
    path: resolve(root, "evidence/03-library-truth.png"),
    fullPage: true,
  });
  const after = await page.evaluate(() => (window as any).agentCity);
  assert.equal(after.selected, id);
  assert.equal(after.truth.agents[id].status, "completed");
  assert.equal(after.presentation.walkers[id].scene, "library");
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await page.screenshot({
    path: resolve(root, "evidence/04-workshop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "MCP Terminal", exact: true }).click();
  await page.screenshot({
    path: resolve(root, "evidence/05-mcp.png"),
    fullPage: true,
  });
  assert.equal(errors.length, 0, errors.join("\n"));
  await writeFile(
    resolve(root, "evidence/browser-proof.json"),
    JSON.stringify(
      {
        producer,
        execution: id,
        dispatchOutput: output,
        browser: browser.version(),
        gates: {
          realDispatch: true,
          realSdk: true,
          realRag: true,
          startBeforeControlledCompletion: true,
          identityAcrossPortal: true,
          truthIndependentOfAnimation: true,
        },
        before,
        after,
        errors,
      },
      null,
      2,
    ),
  );
  proofPassed = true;
  console.log("Browser real-runtime proof: PASS " + id);
} finally {
  release();
  proxy.close();
  await context.close();
  if (proofPassed && page.video())
    await copyFile(
      await page.video()!.path(),
      resolve(root, "evidence/vertical-slice.webm"),
    );
  await browser.close();
}
