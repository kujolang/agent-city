/** Ephemeral GitHub Ubuntu runner only; never invoked by product startup/install. */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
if (process.env.GITHUB_ACTIONS !== "true" || process.platform !== "linux" || !process.env.RUNNER_TEMP)
  throw Error("This policy setup is restricted to an owned ephemeral Linux CI runner");
const executable = chromium.executablePath();
assert(/^\/[a-zA-Z0-9_./-]+$/.test(executable));
const restriction = "/proc/sys/kernel/apparmor_restrict_unprivileged_userns";
const before = readFileSync(restriction, "utf8").trim();
const policy = resolve(process.env.RUNNER_TEMP, "agent-city-ci-browser.apparmor");
writeFileSync(policy, `abi <abi/4.0>,\ninclude <tunables/global>\nprofile agent-city-ci-browser "${executable}" flags=(unconfined) {\n  userns,\n}\n`, { mode: 0o600 });
execFileSync("sudo", ["apparmor_parser", "-r", policy], { stdio: "inherit" });
assert.equal(readFileSync(restriction, "utf8").trim(), before);
console.log(JSON.stringify({ scope: "Exact CI Chromium executable allowed to create its own sandbox; no global userns setting changed", executable, apparmorRestriction: before, chromiumSandboxRequired: true }));
