# Retained real artifact browser acceptance

Source:90b25ce. Run `npx tsx scripts/workcell-browser-proof.ts` on a checkout
with the private mission evidence referenced by `../real/proof.json`.
The local proof starts and stops its own controller and Vite server.

The inspector serves the retained real Kujo/Workcell result (output5, verified
cleanup), and the browser downloads exactly the private API source text with the
correct mission-qualified `.kujo` filename. A controlled delayed503 from an older
selection cannot erase a newer artifact or download. Submission-only interception
checks explicit Workcell/output-check consent, selected project snapshots and reset.
No new model request, Workcell run, or semantic travel occurs in this UI proof.

`proof.json` records assertions; `real-artifact.png` and `real-output.png` show the
actual inspector. `npm run verify` passes104tests, types, boundaries, maps and build.
Unit coverage separately proves built-in draft vs custom reviewed Kujo selection,
byte preservation, unknown-kind rejection and unavailable-check diagnostics.

CI37729388270 at90b25ce passes all5jobs:104source tests, browser onboarding/
fullscreen checks and all4installation platforms. The new byte-download/race
proof above ran locally against retained real evidence; it is not claimed as
part of that clean-install CI job. See ci.json.
