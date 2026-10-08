# Native hidden tab, discard and resume

PASS on local headed Chromium153 in an owned disposable browser profile. The
extension activates another tab, observes document.visibilityState=hidden, invokes
native chrome.tabs.discard and checks discarded=true/active=false. While the tab
is unloaded, the controlled source snapshot changes from active to failed. Native
activation reloads the page, which reports document.wasDiscarded=true, takes a new
snapshot, restores the exact selected execution, stops Follow, displays FAILED and
reconstructs the renderer. Truth matches the fixture exactly; zero source writes.

This is real browser lifecycle behavior with synthetic metadata transport. It is
not OS sleep, a long soak or a new real-agent task. The browser and temporary
extension are test-only; no user browser/profile is changed. Software rendering
is explicitly selected here and is not an application default. The source page
has no attached DevTools session; only the disposable extension worker is
controlled through the browser private pipe. Earlier proof scope text saying
“no attached debugger” refers to the source page, not the extension worker.

The older attached-page harness crashed Chromium151/153; its receipts and
scripts/browser-discard-attached-proof.ts remain for diagnosis. Early native
harness attempts did not reach City: extension loading/reporting and page loading
failed. The passing harness explicitly loads the extension through the browser
pipe, reports through its worker, and uses an isolated mock keychain/basic password
store instead of allowing the test browser to access the system keychain. These
harness failures do not establish an Agent City application crash. Native recovery
now runs under Xvfb in Linux CI too; that result is qualified separately when done.

Reproduce: `npx tsx scripts/browser-discard-proof.ts` (headed test browser required).
No model, container, network business operation or eight-hour soak is invoked.
Chrome API semantics: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-discard
Explicit extension loading follows the private-pipe API exercised by Chrome:
https://github.com/GoogleChrome/chrome-launcher/blob/main/test/load-extension-test.ts

A repeated local run hit the initial20second page-readiness allowance before the
read-only diagnostics were installed; it had not reached discard. Its receipt is
load-deadline-failure.json. Stage waits are now bounded at60seconds and the owned
browser run at180seconds to accommodate this busy host. This changes test deadlines,
not app timing or a performance claim. The independent CI result must still pass.
