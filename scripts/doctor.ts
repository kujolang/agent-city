import { resolve } from "node:path";
import { startupChecks, formatStartupChecks } from "./startup-checks";
const result = await startupChecks(resolve(import.meta.dirname, ".."));
console.log(
  process.argv.includes("--json")
    ? JSON.stringify(result, null, 2)
    : formatStartupChecks(result),
);
process.exitCode = result.ok ? 0 : 1;
