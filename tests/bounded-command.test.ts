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

test("bounded command preserves UTF-8 across separate stdout and stderr writes", async () => {
  const code = [
    "process.stdout.write(Buffer.from([0xc3]));",
    "process.stderr.write(Buffer.from([0xe2, 0x98]));",
    "setTimeout(() => process.stdout.write(Buffer.from([0xa9])), 60);",
    "setTimeout(() => process.stderr.write(Buffer.from([0x83])), 120);",
  ].join("");
  const result = await boundedCommand(process.execPath, ["-e", code], {
    cwd: process.cwd(),
    timeoutMs: 3_000,
  });
  expect(result).toMatchObject({ code: 0, output: "é☃", timedOut: false });
});

test("bounded command rejects durations Node timers cannot represent", () => {
  const options = { cwd: process.cwd() };
  expect(() =>
    boundedCommand(process.execPath, [], {
      ...options,
      timeoutMs: 2_147_483_648,
    }),
  ).toThrow("Invalid process time limit");
  expect(() =>
    boundedCommand(process.execPath, [], {
      ...options,
      graceMs: 2_147_483_648,
    }),
  ).toThrow("Invalid process time limit");
});
