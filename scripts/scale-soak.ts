import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { initialTruth, reduceTruth } from "../packages/world-core/index";
import { performance } from "node:perf_hooks";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROMIUM_PATH ||
    "/Users/robertdevore/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-x64/chrome-headless-shell",
});
const corpus = (
  await readFile("tests/fixtures/phase1-observations.jsonl", "utf8")
)
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const base = corpus.find(
  (e) =>
    e.type === "operation.started" && e.operation.capability === "agent.run",
);
const result: any = {
  kind: "SYNTHETIC snapshots; no runtime proof",
  profiles: [],
  soak: { samples: [] },
};
await mkdir("evidence/hardening", { recursive: true });
try {
  for (const count of [5, 25, 100, 500]) {
    let truth = initialTruth();
    for (let i = 0; i < count; i++)
      truth = reduceTruth(truth, {
        ...base,
        eventId: "scale-" + i,
        instance: "scale:" + i,
        run: { namespace: "scale", id: String(i) },
        order: i + 1,
      });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await page.route("**/api/world/snapshot", (r) =>
      r.fulfill({
        json: {
          truth,
          recent: [],
          cursor: "scale:" + count,
          sourceHealth: { status: "STALE" },
        },
      }),
    );
    await page.route("**/api/world/events?*", (r) =>
      r.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": synthetic snapshot only\n\n",
      }),
    );
    await page.goto("http://127.0.0.1:5178");
    await page.waitForSelector("#roster button");
    await page.locator('[data-scene="workshop"]').click();
    await page.waitForTimeout(500);
    const measurement = await page.evaluate(async () => {
      const a = (window as any).agentCity;
      const frames: number[] = [];
      let prev = performance.now();
      for (let i = 0; i < 120; i++)
        await new Promise<void>((r) =>
          requestAnimationFrame((t) => {
            frames.push(t - prev);
            prev = t;
            r();
          }),
        );
      const t = performance.now();
      (document.querySelector("#roster button") as HTMLElement).click();
      const inspectorMs = performance.now() - t;
      frames.sort((a, b) => a - b);
      return {
        instances: Object.keys(a.truth.agents).length,
        p50: frames[60],
        p95: frames[114],
        inspectorMs,
        heap: (performance as any).memory?.usedJSHeapSize ?? null,
        queue: Object.values(a.presentation.walkers).reduce(
          (n: number, w: any) => n + w.queued.length,
          0,
        ),
      };
    });
    result.profiles.push({ count, ...measurement });
    await page.screenshot({ path: `evidence/hardening/scale-${count}.png` });
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5178");
  await page.waitForSelector("#roster button");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const seconds = Number(process.env.SOAK_SECONDS || 180),
    start = performance.now();
  while (performance.now() - start < seconds * 1000) {
    const metrics = await cdp.send("Performance.getMetrics");
    result.soak.samples.push({
      elapsed: (performance.now() - start) / 1000,
      metrics: metrics.metrics.filter((m) =>
        [
          "JSHeapUsedSize",
          "JSHeapTotalSize",
          "Nodes",
          "Documents",
          "TaskDuration",
        ].includes(m.name),
      ),
      state: await page.evaluate(() => {
        const a = (window as any).agentCity;
        return {
          health: a.health,
          order: a.truth.order,
          rendererReady: a.rendererReady,
          queue: Object.values(a.presentation.walkers).reduce(
            (n: number, w: any) => n + w.queued.length,
            0,
          ),
        };
      }),
    });
    await page.waitForTimeout(10000);
  }
  result.soak.durationSeconds = (performance.now() - start) / 1000;
  result.soak.coverage =
    "Historical real journal with live health polling; no new producer activity. 8-hour live-like soak NOT completed. GPU allocation unavailable.";
  await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
  await new Promise((r) => setTimeout(r, 1000));
  await cdp.send("Page.setWebLifecycleState", { state: "active" });
  await page.waitForTimeout(1100);
  result.soak.freezeResume = {
    truthUsable: (await page.locator("#roster button").count()) > 0,
    kind: "CDP frozen/active; hidden-tab visibility not asserted",
  };
} finally {
  await browser.close();
  await writeFile(
    "evidence/hardening/scale-soak.json",
    JSON.stringify(result, null, 2),
  );
}
console.log(
  JSON.stringify(
    {
      ...result,
      soak: { ...result.soak, samples: result.soak.samples.length },
    },
    null,
    2,
  ),
);
