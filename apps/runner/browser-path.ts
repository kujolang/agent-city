import { chromium } from "@playwright/test";
import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Prefer configured/current Playwright browser; reuse an installed cache revision. */
export async function localChromiumPath(explicit = process.env.CHROMIUM_PATH) {
  if (explicit) {
    await access(explicit, constants.X_OK);
    return explicit;
  }
  try {
    const current = chromium.executablePath();
    await access(current, constants.X_OK);
    return current;
  } catch {}
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === "darwin"
      ? join(homedir(), "Library/Caches/ms-playwright")
      : process.platform === "win32"
        ? join(process.env.LOCALAPPDATA || homedir(), "ms-playwright")
        : join(homedir(), ".cache/ms-playwright"));
  const names = (await readdir(cache))
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const name of names)
    for (const suffix of [
      "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "chrome-linux/chrome",
      "chrome-linux64/chrome",
      "chrome-win/chrome.exe",
      "chrome-win64/chrome.exe",
    ]) {
      const path = join(cache, name, suffix);
      try {
        await access(path, constants.X_OK);
        return path;
      } catch {}
    }
  throw Error(
    "Install Chromium with npx playwright install chromium, or set CHROMIUM_PATH",
  );
}
