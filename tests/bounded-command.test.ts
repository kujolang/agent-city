import { test, expect } from "vitest";
import { boundedCommand } from "../apps/runner/bounded-command";

test("bounded command distinguishes real exit, spawn failure and timeout", async () => {
  const options = { cwd: process.cwd(), timeoutMs: 3000, graceMs: 50 };
  expect(
    await boundedCommand(
      process.execPath,
      ["-e", "console.log('done')"],
      options,
    ),
  ).toMatchObject({ code: 0, output: "done\n", timedOut: false });
  expect(
    await boundedCommand("/missing/city-executable", [], options),
  ).toMatchObject({ code: null, timedOut: false, spawnError: "ENOENT" });
  expect(
    await boundedCommand(
      process.execPath,
      ["-e", "setInterval(()=>{}, 1000)"],
      { ...options, timeoutMs: 100 },
    ),
  ).toMatchObject({ timedOut: true });
});
