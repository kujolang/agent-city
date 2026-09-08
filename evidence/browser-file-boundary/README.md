# Browser file-serving boundary — 2026-09-08

Outcome: fixed in the source candidate; older extracted previews do not receive this fix automatically.

An owned disposable `.runtime/static-privacy-canary.txt` was returned verbatim with HTTP 200 by the previous Vite configuration over `/@fs` (isolated port 18884). No real secrets were requested. The canary was removed and the probe server closed.

The shared development-server boundary now allows browser source packages, authored/compiled assets and npm dependencies only. It preserves Vite 8.2.2's default sensitive-file exclusions, denies runtime directories and configured private storage/database paths, disables the unused public directory, and checks canonical filesystem paths before static serving and after HTML fallback rewriting. API/control proxy routes retain their existing authorization boundary. This is local file-serving hardening, not authentication of a public hosting service.

`tests/browser-file-boundary.test.ts` exercises default/custom private storage, SQLite sidecars, excluded server source, environment/key files, symlink aliases, encoded and double-slash filesystem URLs, raw/url/import queries, HEAD/Range, and directory/extensionless HTML aliases. Owned canaries must never appear in responses. Legitimate HTML/module and both proxy controls must remain available.

The independent prepatch investigator identified the public-directory and canonical-path boundaries. The postpatch reviewer demonstrated a private HTML symlink exposed via directory fallback; the candidate was corrected and that exact route is now a regression test. The reviewer then terminated with an automated security-content rejection, so a completed independent final review is not claimed. Parent source review and executable regression checks completed.

Verification:
- TypeScript: PASS.
- Full suite: 52 tests / 16 files PASS.
- Production build: PASS.
- Pure world-core boundaries: PASS.
- Final browser smoke: 1280px and 320px, reduced motion, keyboard Follow, real renderer/assets with retained truth; no browser errors or horizontal overflow. Evidence: ../follow-viewport/. This is not new live model evidence.
- Fresh bundle launcher additionally checks an owned runtime canary using ordinary/raw/url filesystem requests. See the latest ../launcher/proof.json for the exact packaged source revision and result.

Limits: developer source/asset directories are trusted inputs; concurrent malicious local filesystem mutation is outside this test. Previously extracted bundles remain obsolete and should not be used for private missions. Public release remains unqualified for the separately documented performance, visibility, writing-quality and visual-fidelity gates. No eight-hour soak was run.

The fresh 76914dd extraction additionally exposed an ancestor-path compatibility regression: a `.runtime` folder above the application root was incorrectly denied. The final regression fixture is itself extracted beneath such a folder, and the private-data rule is scoped beneath the lexical/canonical application roots. Its private and legitimate controls pass. The failed artifact remains recorded under ../preview-refresh-76914dd/.
