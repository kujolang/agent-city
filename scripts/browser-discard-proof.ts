/** Native Chrome discard without a DevTools-attached source tab.
 * Disposable extension and profile; controlled server truth, no source execution. */
import { createServer } from "vite";
import { spawn } from "node:child_process";
import { once } from "node:events";
import type { Readable, Writable } from "node:stream";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { localChromiumPath } from "../apps/runner/browser-path";
import {
  initialTruth,
  reduceTruth,
  type OperationEvent,
} from "../packages/world-core";
const out = "evidence/browser-discard";
await mkdir(out, { recursive: true });
await mkdir(".runtime", { recursive: true });
const profile = await mkdtemp(".runtime/native-discard-");
const extension = resolve(profile, "extension");
await mkdir(extension);
const template = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s))
  .find(
    (e) =>
      e.type === "operation.started" && e.operation.capability === "agent.run",
  );
const start: OperationEvent = {
  ...template,
  source: "synthetic-mission-discard",
  instance: "synthetic-mission-discard:run:worker",
  run: { namespace: "synthetic-mission-discard", id: "run" },
  eventId: "discard-start",
  order: 1,
};
let truth = reduceTruth(initialTruth(), start),
  jobStatus = "running",
  snapshots = 0;
const writes: string[] = [];
let received: any,
  stage = "launch";
const server = await createServer({
  root: "apps/web",
  server: { host: "127.0.0.1", port: 18894, strictPort: true },
  plugins: [
    {
      name: "owned-native-discard-fixtures",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          const url = req.url ?? "";
          if (!url.startsWith("/api/") && !url.startsWith("/control/"))
            return next();
          res.setHeader("Content-Type", "application/json");
          if (req.method !== "GET") writes.push(req.method ?? "UNKNOWN");
          if (url.startsWith("/control/"))
            return res.end(
              JSON.stringify({
                configured: true,
                model: "controlled",
                storageHealthy: true,
                busy: jobStatus === "running",
                jobs: [{ id: "mission-discard", status: jobStatus }],
                token: "controlled",
                profiles: [],
                exchanges: [],
              }),
            );
          if (url.includes("/events")) {
            res.setHeader("Content-Type", "text/event-stream");
            res.write(": controlled fixture\n\n");
            return;
          }
          if (url.includes("/snapshot")) snapshots++;
          return res.end(
            JSON.stringify({
              epoch: "discard-fixture",
              truth,
              recent: [],
              order: truth.order,
              cursor: "discard-fixture:" + truth.order,
              sourceHealth: { status: "LIVE" },
            }),
          );
        });
      },
    },
  ],
});
await writeFile(
  resolve(extension, "manifest.json"),
  JSON.stringify({
    manifest_version: 3,
    name: "Owned native discard proof",
    version: "1.0",
    permissions: ["tabs", "scripting"],
    host_permissions: ["http://127.0.0.1/*"],
    background: { service_worker: "worker.js" },
  }),
);
// Raw browser JavaScript avoids transpiler helpers in injected functions.
await writeFile(
  resolve(extension, "worker.js"),
  String.raw`
let started=false;
async function run() {
  if(started)return; started=true;
  globalThis.proofRecords=[];
  const send=async data=>{
    globalThis.proofRecords.push(data);
    if(data.finishSource){const until=Date.now()+10000;while(!globalThis.sourceFinished&&Date.now()<until)await new Promise(r=>setTimeout(r,100));if(!globalThis.sourceFinished)throw Error("Fixture source acknowledgement timeout");}
  };
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  let stage="create";
  try {
    globalThis.proofStage=stage;
    await send({stage});
    const tab=await chrome.tabs.create({url:"http://127.0.0.1:18894/",active:true});
    const inspect=async()=>{
      const result=await chrome.scripting.executeScript({target:{tabId:tab.id},world:"MAIN",func:()=>{
        const a=window.agentCity;
        return {selected:a?.selected,follow:a?.follow,order:a?.truth?.order,truth:a?.truth,rendererReady:a?.rendererReady,wasDiscarded:document.wasDiscarded,visibility:document.visibilityState,inspector:document.querySelector("#truth")?.textContent,browser:navigator.userAgent};
      }}); return result[0].result;
    };
    async function waitFor(predicate) {
      const until=Date.now()+60000;let last;
      while(Date.now()<until){try{last=await inspect();if(predicate(last))return last;}catch{}await pause(200);}
      throw Error("Timed out at "+stage+": "+JSON.stringify(last));
    }
    stage="load";await send({stage});
    await waitFor(s=>s.order===1 && s.rendererReady);
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:"MAIN",func:()=>document.querySelector('[data-instance="synthetic-mission-discard:run:worker"]').click()});
    const before=await waitFor(s=>s.follow==="synthetic-mission-discard:run:worker");
    stage="hide";await send({stage});
    await chrome.tabs.create({windowId:tab.windowId,url:"about:blank",active:true});
    const hidden=await waitFor(s=>s.visibility==="hidden");
    stage="discard";await send({stage});
    const discarded=await chrome.tabs.discard(tab.id);
    if(!discarded?.discarded || discarded.active)throw Error("Native discard did not occur");
    await send({stage:"discarded",finishSource:true});
    stage="resume";
    await chrome.tabs.update(tab.id,{active:true});
    const after=await waitFor(s=>s.wasDiscarded===true && s.order===2 && s.rendererReady);
    await send({complete:true,status:"OBSERVED",before,hidden,after,discarded:{discarded:discarded.discarded,active:discarded.active}});
  }catch(error){await send({complete:true,status:"FAILED",stage,error:String(error)});}
}
chrome.runtime.onInstalled.addListener(run);
chrome.runtime.onStartup.addListener(run);
run();
`,
);
await server.listen();
const browser = spawn(
  await localChromiumPath(),
  [
    "--no-first-run",
    "--password-store=basic",
    "--use-mock-keychain",
    "--disable-default-apps",
    "--disable-component-extensions-with-background-pages",
    "--enable-logging=stderr",
    "--enable-automation",
    "--enable-unsafe-extension-debugging",
    "--no-default-browser-check",
    "--no-sandbox",
    "--disable-background-networking",
    "--disable-sync",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    `--user-data-dir=${resolve(profile)}`,
    "--remote-debugging-pipe",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] },
);
let browserLog = "";
browser.stderr!.on("data", (chunk) => {
  browserLog = (browserLog + chunk).slice(-6000);
});
const exit = once(browser, "exit");
let extensionLoaded = false,
  extensionError = "";
let messages = "",
  workerSession = "",
  workerDiagnostic: unknown;
(browser.stdio[4] as Readable).on("data", (chunk) => {
  messages += chunk;
  let end;
  while ((end = messages.indexOf("\0")) !== -1) {
    const message = JSON.parse(messages.slice(0, end));
    messages = messages.slice(end + 1);
    if (
      message.method === "Target.targetCreated" &&
      message.params.targetInfo.type === "service_worker"
    ) {
      (browser.stdio[3] as Writable).write(
        JSON.stringify({
          id: 3,
          method: "Target.attachToTarget",
          params: {
            targetId: message.params.targetInfo.targetId,
            flatten: true,
          },
        }) + "\0",
      );
    }
    if (message.id === 3) workerSession = message.result?.sessionId ?? "";
    if (message.id === 4) {
      workerDiagnostic = message.result?.result?.value;
      if (typeof workerDiagnostic === "string") {
        const diagnostic = JSON.parse(workerDiagnostic);
        for (const data of diagnostic.records ?? []) {
          if (data.stage) stage = data.stage;
          if (data.complete) received = data;
          if (data.finishSource && jobStatus === "running") {
            truth = reduceTruth(truth, {
              ...start,
              eventId: "discard-failed",
              order: 2,
              type: "operation.failed",
              operation: { ...start.operation, outcome: "failed" },
            });
            jobStatus = "failed";
            (browser.stdio[3] as Writable).write(
              JSON.stringify({
                id: 5,
                sessionId: workerSession,
                method: "Runtime.evaluate",
                params: { expression: "globalThis.sourceFinished=true" },
              }) + "\0",
            );
          }
        }
      }
    }
    if (message.id === 1) {
      extensionLoaded = !!message.result?.id;
      extensionError = message.error?.message ?? "";
    }
  }
});
(browser.stdio[3] as Writable).on("error", () => {});
(browser.stdio[3] as Writable).write(
  JSON.stringify({
    id: 1,
    method: "Extensions.loadUnpacked",
    params: { path: extension },
  }) + "\0",
);
(browser.stdio[3] as Writable).write(
  JSON.stringify({
    id: 2,
    method: "Target.setDiscoverTargets",
    params: { discover: true },
  }) + "\0",
);
const diagnostics = setInterval(() => {
  if (workerSession)
    (browser.stdio[3] as Writable).write(
      JSON.stringify({
        id: 4,
        sessionId: workerSession,
        method: "Runtime.evaluate",
        params: {
          expression:
            "JSON.stringify({stage:globalThis.proofStage,error:globalThis.proofError,records:globalThis.proofRecords})",
          returnByValue: true,
        },
      }) + "\0",
    );
}, 1000);
const report: any = {
  scope:
    "Synthetic truth transport; native headed Chromium hidden/discard/resume, no debugger attached to the source page; extension worker controlled over private pipe; no source execution or OS sleep",
  softwareRendering: true,
};
try {
  const loadUntil = Date.now() + 10000;
  while (
    !extensionLoaded &&
    !extensionError &&
    Date.now() < loadUntil &&
    browser.exitCode === null &&
    browser.signalCode === null
  )
    await new Promise((r) => setTimeout(r, 100));
  assert(extensionLoaded, "Extension loading failed: " + extensionError);
  const until = Date.now() + 180000;
  while (
    !received &&
    Date.now() < until &&
    browser.exitCode === null &&
    browser.signalCode === null
  )
    await new Promise((r) => setTimeout(r, 200));
  assert(received, "No completed native browser report at " + stage);
  Object.assign(report, received);
  assert.equal(received.status, "OBSERVED", received.error);
  assert.equal(received.after.selected, received.before.selected);
  assert.equal(received.after.inspector, "FAILED");
  assert.deepEqual(received.after.truth, truth);
  assert(received.after.wasDiscarded);
  assert(received.after.rendererReady);
  assert.equal(received.hidden.visibility, "hidden");
  assert(snapshots >= 2);
  assert.deepEqual(writes, []);
  report.status = "PASS";
  report.snapshots = snapshots;
  report.sourceWrites = writes.length;
} catch (error) {
  report.status = "FAILED";
  report.error = String(error);
  report.stage = stage;
  report.browserLog = browserLog;
  report.workerDiagnostic = workerDiagnostic;
  process.exitCode = 1;
} finally {
  clearInterval(diagnostics);
  browser.kill("SIGTERM");
  const kill = setTimeout(() => browser.kill("SIGKILL"), 2000);
  await exit;
  clearTimeout(kill);
  await server.close();
  await writeFile(
    out + (report.status === "PASS" ? "/proof.json" : "/native-failure.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: report.status,
      stage: report.stage,
      error: report.error,
      snapshots,
    }),
  );
}
