import { chromium } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { localChromiumPath } from "./browser-path";

export interface FunctionCase {
  name: string;
  args: unknown[];
  equals?: unknown;
  throws?: string;
}
export interface FunctionContract {
  exportName: string;
  cases: FunctionCase[];
}

export function validateFunctionContract(value: unknown): FunctionContract {
  const v = value as FunctionContract;
  if (
    !v ||
    typeof v.exportName !== "string" ||
    !/^[A-Za-z_$][\w$]{0,79}$/.test(v.exportName) ||
    !Array.isArray(v.cases) ||
    v.cases.length < 1 ||
    v.cases.length > 24
  )
    throw Error("Specify an exported function and 1–24 explicit cases");
  const serialized = JSON.stringify(v, (_key, value) => {
    if (
      ["undefined", "function", "symbol", "bigint"].includes(typeof value) ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      throw Error("Cases must contain finite JSON data");
    return value;
  });
  if (serialized.length > 16_384) throw Error("Contract too large");
  for (const c of v.cases) {
    if (
      !c ||
      typeof c.name !== "string" ||
      !c.name ||
      c.name.length > 100 ||
      !Array.isArray(c.args) ||
      Object.hasOwn(c, "equals") === Object.hasOwn(c, "throws") ||
      (Object.hasOwn(c, "throws") &&
        !["Error", "TypeError", "RangeError"].includes(c.throws!))
    )
      throw Error(
        "Each case needs arguments and exactly one expected value or error name",
      );
  }
  return v;
}

/** Explicit JSON-in/JSON-out module checks in a disposable, sandboxed browser worker.
 * No Node evaluation, filesystem bindings, source credentials or external network.
 * A fresh worker/module is used for each case; parent owns expectations/comparison.
 */
export async function checkFunctions(
  code: string,
  input: FunctionContract,
  executablePath = process.env.CHROMIUM_PATH,
) {
  const contract = validateFunctionContract(input);
  if (Buffer.byteLength(code) > 262144) throw Error("Code too large");
  const browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
    executablePath: await localChromiumPath(executablePath),
    env: {
      PATH: process.env.PATH || "/usr/bin:/bin",
      ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
    },
    timeout: 15000,
  });
  const results: Array<{
    name: string;
    status: string;
    reason: string;
    occurredAt: number;
  }> = [];
  let blockedRequests = 0;
  try {
    const context = await browser.newContext({
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    await context.route("**/*", (route) => {
      if (
        route.request().isNavigationRequest() &&
        route.request().url() === "https://city-execution.invalid/"
      )
        return route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Isolated function checks</title>",
          headers: {
            "Content-Security-Policy":
              "default-src 'none'; script-src blob:; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
          },
        });
      blockedRequests++;
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.goto("https://city-execution.invalid/");
    // tsx preserves function names when serializing the trusted page harness.
    await page.evaluate("globalThis.__name = value => value");
    for (const c of contract.cases) {
      const nonce = randomBytes(32).toString("hex");
      const result = await page.evaluate(
        async ({ code, args, exportName, nonce }) => {
          const moduleURL = URL.createObjectURL(
            new Blob([code], { type: "text/javascript" }),
          );
          // Intrinsics and reporting channel are captured before importing untrusted code.
          const harness = `const report = self.postMessage.bind(self), stringify = JSON.stringify.bind(JSON), nonce = ${JSON.stringify(nonce)};
          try { const m = await import(${JSON.stringify(moduleURL)});
            if (typeof m[${JSON.stringify(exportName)}] !== 'function') report({nonce,kind:'missing-export'});
            else { try { const value = await m[${JSON.stringify(exportName)}](...${JSON.stringify(args)});
              const json = stringify(value);
              if (typeof json !== 'string' || json.length > 16384) report({nonce,kind:'result-not-bounded-json'});
              else report({nonce,kind:'returned',json});
            } catch(e) { report({nonce,kind:'threw',name:typeof e?.name === 'string' ? e.name.slice(0,80) : 'unknown'}); } }
          } catch(e) { report({nonce,kind:'module-error'}); }`;
          const workerURL = URL.createObjectURL(
            new Blob([harness], { type: "text/javascript" }),
          );
          return await new Promise<any>((resolve) => {
            const worker = new Worker(workerURL, { type: "module" });
            const finish = (value: any) => {
              clearTimeout(timer);
              worker.terminate();
              URL.revokeObjectURL(workerURL);
              URL.revokeObjectURL(moduleURL);
              resolve(value);
            };
            const timer = setTimeout(() => finish({ kind: "timeout" }), 1500);
            worker.onerror = () => finish({ kind: "worker-error" });
            worker.onmessage = (event) => {
              if (event.data?.nonce === nonce) finish(event.data);
            };
          });
        },
        { code, args: c.args, exportName: contract.exportName, nonce },
      );
      let returned: unknown;
      try {
        returned = JSON.parse(result.json);
      } catch {}
      const passed = Object.hasOwn(c, "throws")
        ? result.kind === "threw" && result.name === c.throws
        : result.kind === "returned" &&
          typeof result.json === "string" &&
          isDeepStrictEqual(returned, c.equals);
      results.push({
        name: c.name,
        status: passed ? "passed" : "failed",
        reason: passed ? "expectation-met" : result.kind,
        occurredAt: Date.now(),
      });
    }
    return {
      schema: "agent-city.function-check.v1",
      status: results.every((r) => r.status === "passed") ? "passed" : "failed",
      environment: "disposable-chromium-module-worker",
      browserSandboxRequested: true,
      browser: browser.version(),
      codeExecuted: true,
      scope:
        "explicit JSON function cases only; no filesystem or network integrations",
      blockedRequests,
      cases: results,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}
