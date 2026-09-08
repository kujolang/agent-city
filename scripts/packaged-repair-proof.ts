import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { chromium, type Browser } from "@playwright/test";
import { localChromiumPath } from "../apps/runner/browser-path";
import { localPorts } from "./local-ports";
import { portAvailable } from "./startup-checks";
const bundle = resolve(process.argv[2] || "");
assert(process.argv[2], "Provide the previously tested extraction");
const out = resolve("evidence/packaged-repair");
await mkdir(out, { recursive: true });
const parent = JSON.parse(
  await readFile("evidence/packaged-missions/code.json", "utf8"),
);
const ports = localPorts({ CITY_PORT_OFFSET: "30000" });
for (const port of Object.values(ports))
  assert(await portAvailable(port), "Owned proof port occupied");
const url = `http://127.0.0.1:${ports.web}`;
const child = spawn(process.execPath, ["--import", "tsx", "scripts/start.ts"], {
  cwd: resolve(bundle, "agent-city"),
  env: {
    ...process.env,
    CITY_PORT_OFFSET: "30000",
    CITY_PORT: String(ports.gateway),
    CITY_CONTROL_PORT: String(ports.control),
    KUJO_BIN: resolve(bundle, "kujo/target/release/kujo"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser: Browser | undefined,
  log = "";
child.stdout.on("data", (d) => (log = (log + d).slice(-8000)));
child.stderr.on("data", (d) => (log = (log + d).slice(-8000)));
const deadline = setTimeout(() => {
  child.kill("SIGTERM");
  void browser?.close();
  process.exitCode = 1;
}, 300000);
try {
  while (!log.includes("Agent City ready:")) {
    assert(child.exitCode === null && child.signalCode === null, log);
    await new Promise((r) => setTimeout(r, 200));
  }
  const before = await (await fetch(url + "/control/status")).json();
  assert(before.jobs.some((j: any) => j.id === parent.job.id));
  browser = await chromium.launch({
    headless: true,
    executablePath: await localChromiumPath(),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  let id = process.env.CITY_REPAIR_RESUME || "";
  if (id) assert(/^mission-[0-9a-f-]{36}$/.test(id));
  else {
    await page.locator(`[data-continue="${parent.job.id}"]`).click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[name="kind"]') as HTMLSelectElement).disabled,
    );
    assert.equal(
      JSON.parse(await page.locator('[name="functionContract"]').inputValue())
        .cases.length,
      3,
    );
    await page
      .locator('[name="prompt"]')
      .fill(
        "Repair the prior code artifact. Its only reported module error was the unmatched Markdown opening fence. Return a complete plain JavaScript ES module, beginning with export function sum(numbers). No backticks, no Markdown, no prose. Preserve the sum behavior and all three original checks. This is executable source code, not a documentation answer.",
      );
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/control/missions") &&
        r.request().method() === "POST",
    );
    await page.locator("#mission-form button").click();
    const accepted = await response;
    assert.equal(accepted.status(), 202);
    id = (await accepted.json()).id;
  }
  let job: any;
  const end = Date.now() + 220000;
  while (Date.now() < end) {
    const s = await (await fetch(url + "/control/status")).json();
    job = s.jobs.find((j: any) => j.id === id);
    if (["completed", "failed"].includes(job?.status)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(["completed", "failed"].includes(job?.status));
  const artifact = await (await fetch(url + "/control/artifact/" + id)).json();
  const exchanges = await (
    await fetch(url + "/control/exchanges/" + id)
  ).json();
  await page.waitForFunction(() => Boolean((window as any).agentCity));
  // Give the real canonical bridge time to expose the check outcomes, not animation authority.
  await page.waitForFunction(
    (id) =>
      Object.values((window as any).agentCity.truth.agents).some(
        (a: any) =>
          a.id.includes(id) &&
          Object.values(a.operations).filter(
            (o: any) =>
              o.capability === "evaluation.run" &&
              ["failed", "succeeded"].includes(o.status),
          ).length >= 3,
      ),
    id,
    { timeout: 20000 },
  );
  const truth = await page.evaluate(() => (window as any).agentCity.truth);
  const old = await (
    await fetch(url + "/control/artifact/" + parent.job.id)
  ).json();
  assert.deepEqual(old, parent.artifact, "Original failed artifact changed");
  await page.locator('[data-scene="dojo"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(out, "dojo.png") });
  await writeFile(
    resolve(out, "proof.json"),
    JSON.stringify(
      {
        kind: "REAL packaged local-model continuation; actual checks",
        observationMode: process.env.CITY_REPAIR_RESUME
          ? "reopened existing real result; no new execution"
          : "live continuation",
        parent: parent.job.id,
        job,
        artifact,
        exchanges,
        truth,
        originalFailedArtifactUnchanged: true,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  assert.equal(job.status, "completed");
  assert.equal(exchanges.records.length, 2);
  assert.equal(artifact.validation.syntax, "valid");
  assert.equal(artifact.functional.status, "passed");
  assert.deepEqual(errors, []);
  console.log("Packaged failed-code continuation and three checks: PASS");
} finally {
  clearTimeout(deadline);
  await browser?.close();
  child.kill("SIGTERM");
  for (
    let i = 0;
    i < 100 && child.exitCode === null && child.signalCode === null;
    i++
  )
    await new Promise((r) => setTimeout(r, 100));
  const released = await Promise.all(Object.values(ports).map(portAvailable));
  await writeFile(
    resolve(out, "shutdown.json"),
    JSON.stringify({ exitCode: child.exitCode, released }, null, 2) + "\n",
  );
}
