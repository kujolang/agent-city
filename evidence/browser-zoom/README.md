# Native browser zoom and roster focus

Bounded local Chromium test against the retained `convergence-1788888381276` corpus. No new model, tool, Eval or Dispatch work was run. Three observed execution instances remain visible in the roster. The isolated launcher used port offset 30000 and was shut down after verification.

The harness uses an ephemeral extension in a fresh Chromium profile, calls `chrome.tabs.setZoom`, reads `getZoom`, and independently asserts the resulting device-pixel ratio. This exercises native tab zoom, not CSS zoom or CDP page scaling. It does not test clicking the browser menu. The extension and profile are removed after the test; nothing is installed in the user's browser.

Sources: [Chrome tab zoom API](https://developer.chrome.com/docs/extensions/reference/api/tabs) and [Playwright extension setup](https://playwright.dev/docs/next/chrome-extensions).

## Results

- Chromium 151.0.7922.34, application source `b015d673015ae0a573fd4422bb390172b844b09a`.
- Native zoom 100%, 125%, 200%, then 100% restored.
- Observed DPR: 1, 1.25, 2, 1. Corresponding CSS viewport widths: 1280, 1024, 640, 1280.
- No document horizontal overflow or page errors. Keyboard activation selects an observed execution and retains focus on that exact source-qualified execution ID at every zoom.
- `proof.json` contains assertions and measurements. PNGs use direct device-pixel capture; Playwright's CSS-sized screenshot clip cropped native-zoom captures, so it is not used by the final harness.

The initial test failed even at 100%: roster replacement on selection removed the focused button. The product fix preserves focus by execution ID across replacement; if a filter removes that instance, focus returns to the filter rather than another worker. `failure.json` retains the original failure; Casefile ID `2026-09-08-144140-nativezoomrosterfocus` captured it without rerunning source work.

Typecheck/build and all 50 tests passed; after adding malformed zoom-evidence cases, the seven release-assessment tests passed again. This closes the native tab-zoom qualification only. Overall release remains FAIL due to full-path throughput; hidden-tab resume remains unqualified and the eight-hour soak remains explicitly cancelled. Visual reference fidelity requires separate review. Concurrent host load is not evidence of a correctness failure or a reason to disregard one.

Reproduce against an already running local app: `CITY_BROWSER_URL=http://127.0.0.1:35178 npx tsx scripts/browser-zoom-proof.ts`. The harness has a 60-second bound and never starts missions or a soak.
