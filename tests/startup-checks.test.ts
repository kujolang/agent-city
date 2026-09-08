import { test, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import {
  startupChecks,
  formatStartupChecks,
  portAvailable,
  resolveExecutable,
} from "../scripts/startup-checks";

test("reports all missing prerequisites without creating runtime state or calling a model", async () => {
  const root = await mkdtemp(join(tmpdir(), "city-doctor-"));
  try {
    const result = await startupChecks(
      root,
      { PATH: "", KUJO_BIN: "missing-kujo" },
      "22.0.0",
      false,
    );
    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.id === "node")?.status).toBe("FAIL");
    expect(result.checks.find((c) => c.id === "kujo")?.status).toBe("FAIL");
    expect(
      result.checks.find((c) => c.id === "../watchdog/dashboard_server.kujo")
        ?.status,
    ).toBe("FAIL");
    expect(formatStartupChecks(result)).toContain("Run npm ci");
    expect(formatStartupChecks(result)).toContain(
      "does not contact a provider",
    );
    const { readdir } = await import("node:fs/promises");
    expect(await readdir(root)).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("resolves executable KUJO_BIN from PATH and rejects nonexecutable files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-bin-"));
  try {
    await writeFile(join(dir, "kujo"), "#!/bin/sh\nexit 99\n", { mode: 0o700 });
    await writeFile(join(dir, "not-executable"), "data", { mode: 0o600 });
    expect(await resolveExecutable("kujo", dir, dir)).toBe(join(dir, "kujo"));
    await expect(resolveExecutable("not-executable", dir, dir)).rejects.toThrow(
      "Kujo executable unavailable",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("detects a non-HTTP listener without contacting or stopping it", async () => {
  let connections = 0;
  const server = createServer((socket) => {
    connections++;
    socket.destroy();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  try {
    expect(await portAvailable(port)).toBe(false);
    expect(server.listening).toBe(true);
    expect(connections).toBe(0);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
  expect(await portAvailable(port)).toBe(true);
});

test("rejects duplicate configured service ports before launch", async () => {
  const root = await mkdtemp(join(tmpdir(), "city-ports-"));
  try {
    const result = await startupChecks(
      root,
      {
        PATH: "",
        KUJO_BIN: "missing",
        CITY_PORT: "5178",
        CITY_CONTROL_PORT: "invalid",
      },
      "24.0.0",
      true,
    );
    expect(result.checks.find((c) => c.id === "gateway")?.message).toContain(
      "both use port 5178",
    );
    expect(
      result.checks.find((c) => c.id === "mission service")?.message,
    ).toContain("Invalid");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
