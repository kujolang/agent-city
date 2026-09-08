import { test, expect } from "vitest";
import { createServer } from "vite";
import { createServer as httpServer } from "node:http";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { browserFileBoundary } from "../apps/web/file-boundary";

test("browser file server denies private data and aliases while retaining modules and proxies", async () => {
  const parent = await mkdtemp(resolve(tmpdir(), "city-files-"));
  const root = resolve(parent, ".runtime/extracted/agent-city");
  await mkdir(root, { recursive: true });
  const web = resolve(root, "apps/web");
  const marker = "owned-private-canary-never-serve";
  const paths = [
    ".runtime/private.txt",
    "assets/source/private-store/secret.txt",
    "apps/web/public/secret.txt",
    "apps/web/custom.sqlite",
    "apps/web/custom.sqlite-wal",
    "apps/runner/private.txt",
    "apps/web/.env",
    "apps/web/private.key",
  ];
  const upstream = httpServer((req, res) => res.end(`stub:${req.url}`));
  await new Promise<void>((done) => upstream.listen(0, "127.0.0.1", done));
  const port = (upstream.address() as { port: number }).port;
  const boundary = browserFileBoundary(root, {
    CITY_RUNTIME_DIR: resolve(root, "assets/source/private-store"),
    CITY_CONTROL_DIR: resolve(web, "public"),
    CITY_DB: resolve(web, "custom.sqlite"),
  });
  const server = await createServer({
    configFile: false,
    root: web,
    publicDir: false,
    logLevel: "silent",
    plugins: [boundary.plugin],
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: boundary.fs,
      proxy: {
        "/api": `http://127.0.0.1:${port}`,
        "/control": `http://127.0.0.1:${port}`,
      },
    },
  });
  try {
    for (const path of paths) {
      const target = resolve(root, path);
      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, marker);
    }
    await writeFile(
      resolve(web, "index.html"),
      "<html><body>public control</body></html>",
    );
    await writeFile(resolve(web, "main.ts"), "export const publicValue = 42;");
    await symlink(
      resolve(root, ".runtime/private.txt"),
      resolve(web, "alias.txt"),
    );
    await mkdir(resolve(web, "nested"));
    await symlink(
      resolve(root, ".runtime/private.txt"),
      resolve(web, "nested/index.html"),
    );
    await server.listen();
    const origin = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`;
    for (const path of [...paths, "apps/web/alias.txt"]) {
      const absolute = resolve(root, path);
      const variants = [
        `/@fs${absolute}`,
        `/@fs/${absolute}`,
        `/@fs${absolute.replaceAll("/", "%2F")}`,
        `/@fs${absolute}?raw`,
        `/@fs${absolute}?url`,
        `/@fs${absolute}?import`,
      ];
      if (path.startsWith("apps/web/")) variants.push(`/${path.slice(9)}`);
      for (const url of variants) {
        const response = await fetch(origin + url);
        expect(await response.text(), url).not.toContain(marker);
        expect(response.status, url).toBe(403);
      }
      for (const method of ["HEAD", "GET"]) {
        const response = await fetch(origin + `/@fs${absolute}`, {
          method,
          headers: { Range: "bytes=0-100" },
        });
        expect(response.status).toBe(403);
        expect(await response.text()).not.toContain(marker);
      }
    }
    expect(await (await fetch(origin + "/")).text()).toContain(
      "public control",
    );
    expect(await (await fetch(origin + "/main.ts")).text()).toContain(
      "publicValue",
    );
    for (const path of ["/nested/", "/nested/index", "/nested/index.html"]) {
      const response = await fetch(origin + path);
      expect(await response.text()).not.toContain(marker);
      expect(response.status).toBe(403);
    }
    for (const path of ["/api/health", "/control/health"])
      expect(await (await fetch(origin + path)).text()).toBe(`stub:${path}`);
  } finally {
    await server.close();
    await new Promise<void>((done) => upstream.close(() => done()));
    await rm(parent, { recursive: true, force: true });
  }
}, 30000);
