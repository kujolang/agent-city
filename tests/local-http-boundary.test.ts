import { expect, test } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

async function ephemeralPort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  if (!address || typeof address === "string") throw Error("Missing test port");
  await new Promise<void>((done) => socket.close(() => done()));
  return address.port;
}

test.each([
  ["gateway", "CITY_PORT", "/api/world/status"],
  ["runner", "CITY_CONTROL_PORT", "/control/status"],
])(
  "%s rejects cross-site browser reads and retains local access",
  async (app, portVar, route) => {
    const port = await ephemeralPort();
    const runtime = await mkdtemp(resolve(tmpdir(), "city-local-http-"));
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(
      process.execPath,
      ["--import", "tsx", `apps/${app}/main.ts`],
      {
        env: {
          ...process.env,
          [portVar]: String(port),
          CITY_WEB_ORIGIN: origin,
          CITY_RUNTIME_DIR: runtime,
          CITY_CONTROL_DIR: resolve(runtime, "control"),
          CITY_MISSIONS_DIR: resolve(runtime, "missions"),
          CITY_DB: resolve(runtime, "journal.sqlite"),
          WDG_API_AUTH_TOKEN: undefined,
        },
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    const done = once(child, "close");
    const abort = new AbortController();
    try {
      await Promise.race([
        once(child.stdout, "data", { signal: AbortSignal.timeout(30_000) }),
        done.then(([code]) => {
          throw Error(`Test server exited early (${code})`);
        }),
      ]);
      const denied = await fetch(origin + route, {
        headers: { "Sec-Fetch-Site": "cross-site" },
        signal: AbortSignal.timeout(2_000),
      });
      expect(denied.status).toBe(403);
      expect(await denied.json()).toHaveProperty("error");
      for (const site of [null, "same-origin"]) {
        const local = await fetch(origin + route, {
          headers: site ? { "Sec-Fetch-Site": site } : {},
          signal: AbortSignal.timeout(2_000),
        });
        expect(local.status).toBe(200);
        await local.body?.cancel();
      }
      if (app === "gateway") {
        const events = origin + "/api/world/events";
        const streams = await Promise.all(
          Array.from({ length: 32 }, () =>
            fetch(events, {
              signal: AbortSignal.any([
                abort.signal,
                AbortSignal.timeout(5_000),
              ]),
            }),
          ),
        );
        expect(streams.every((response) => response.status === 200)).toBe(true);
        const full = await fetch(events, {
          signal: AbortSignal.timeout(2_000),
        });
        expect(full.status).toBe(503);
        await full.body?.cancel();

        await streams[0].body?.cancel();
        await expect
          .poll(
            async () => {
              const reopened = await fetch(events, {
                signal: AbortSignal.timeout(2_000),
              });
              await reopened.body?.cancel();
              return reopened.status;
            },
            { interval: 25, timeout: 2_000 },
          )
          .toBe(200);
      }
    } finally {
      abort.abort();
      child.kill("SIGKILL");
      await done;
      await rm(runtime, { recursive: true, force: true });
    }
  },
  45_000,
);
