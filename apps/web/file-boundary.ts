import { realpath } from "node:fs/promises";
import {
  resolve,
  relative,
  isAbsolute,
  sep,
  dirname,
  basename,
} from "node:path";
import { isFileServingAllowed, type Plugin, type Connect } from "vite";

const within = (file: string, directory: string) => {
  const part = relative(directory, file);
  return (
    part === "" ||
    (!part.startsWith(`..${sep}`) && part !== ".." && !isAbsolute(part))
  );
};
const globLiteral = (path: string) =>
  path.replaceAll("\\", "/").replace(/[?*{}()[\]!+@]/g, "\\$&");
async function canonical(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error: any) {
    if (error.code !== "ENOENT" || dirname(path) === path) throw error;
    return resolve(await canonical(dirname(path)), basename(path));
  }
}

/** The development server serves browser inputs only, never local runtime data. */
export function browserFileBoundary(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const web = resolve(root, "apps/web");
  const allow = [
    "apps/web",
    "packages/renderer-pixi",
    "packages/world-core",
    "packages/protocol",
    "assets/source",
    "assets/compiled",
    "node_modules",
  ].map((p) => resolve(root, p));
  const privateDirectories = [
    ".runtime",
    env.CITY_RUNTIME_DIR,
    env.CITY_CONTROL_DIR,
    env.CITY_MISSIONS_DIR,
    env.CITY_LEDGER_DIR,
  ]
    .filter((p): p is string => !!p)
    .flatMap((p) => [resolve(root, p), resolve(p)]);
  const privateFiles = env.CITY_DB
    ? [resolve(root, env.CITY_DB), resolve(env.CITY_DB)].flatMap((p) => [
        p,
        `${p}-wal`,
        `${p}-shm`,
        `${p}-journal`,
      ])
    : [];
  const privatePath = (p: string) =>
    (within(p, root) && relative(root, p).split(sep).includes(".runtime")) ||
    privateDirectories.some((d) => within(p, d)) ||
    privateFiles.includes(p);
  const deny = [
    ".env",
    ".env.*",
    "*.{crt,pem,key,p12,pfx,cer,der}",
    ".npmrc",
    ".yarnrc.yml",
    "**/.git/**",
    `${globLiteral(root)}/**/.runtime/**`,
    ...privateDirectories.flatMap((p) => [
      globLiteral(p),
      `${globLiteral(p)}/**`,
    ]),
    ...privateFiles.map(globLiteral),
  ];
  const plugin: Plugin = {
    name: "agent-city-browser-file-boundary",
    async configureServer(server) {
      const realRoot = await canonical(root);
      const realAllow = await Promise.all(allow.map(canonical));
      server.config.server.fs.allow.push(...realAllow);
      const realPrivateDirectories = await Promise.all(
        privateDirectories.map(canonical),
      );
      const realPrivateFiles = await Promise.all(privateFiles.map(canonical));
      const guard: Connect.NextHandleFunction = async (
        request,
        response,
        next,
      ) => {
        let path: string;
        try {
          path = decodeURIComponent((request.url || "/").split("?")[0]);
        } catch {
          response.statusCode = 400;
          response.end("Invalid path");
          return;
        }
        // These are API namespaces, not filesystem requests.
        if (/^\/(api|control)(\/|$)/.test(path)) {
          next();
          return;
        }
        const file = path.startsWith("/@fs/")
          ? resolve(path.slice(4))
          : resolve(web, `.${path}`);
        try {
          const actual = await realpath(file);
          if (
            !isFileServingAllowed(server.config, file) ||
            !isFileServingAllowed(server.config, actual) ||
            privatePath(file) ||
            privatePath(actual) ||
            (within(actual, realRoot) &&
              relative(realRoot, actual).split(sep).includes(".runtime")) ||
            realPrivateDirectories.some((d) => within(actual, d)) ||
            realPrivateFiles.includes(actual) ||
            !realAllow.some((d) => within(actual, d))
          ) {
            response.statusCode = 403;
            response.end("File access denied");
            return;
          }
        } catch (error: any) {
          if (error.code !== "ENOENT" && error.code !== "ENOTDIR") {
            response.statusCode = 403;
            response.end("File access denied");
            return;
          }
        }
        next();
      };
      server.middlewares.use(guard);
      // Vite resolves directory/extensionless HTML after its static middleware.
      return () => server.middlewares.use(guard);
    },
  };
  return { fs: { strict: true, allow, deny }, plugin };
}
