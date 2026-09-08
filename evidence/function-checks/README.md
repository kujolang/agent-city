# Isolated function checks — real failure and repair

This is an explicit local mission capability for small ES modules with JSON
arguments/results. It is not general host-code or Workcell execution.

- `proof.json`: retained real code fails missing-export checks. A separately labeled
  synthetic correct implementation passes as a control. A listening local HTTP
  service is reachable from the host but receives zero requests from the worker;
  the worker has no Node process/require bindings. Infinite-loop termination and
  forged result rejection pass.
- First integrated real attempt: `mission-02fd801a-1185-4331-b365-7b157d4af2db`,
  `../live-missions/live-1788875669773-/code.json`. The model returned CommonJS code;
  ES-module checks failed. Five observed instances include a separate checker.
- Subsequent real repair: `mission-6998b158-66e3-46f3-8dad-2db59c197e18`,
  `../live-missions/live-1788875810380-/code.json`. Its task explicitly included the
  earlier failure and code. The model produced a named ES export and all four
  cases passed: empty array, mixed numbers, numeric-string rejection, null rejection.
  Both attempts and all model responses remain retained.
- `browser.json` / `real-pass-inspector.png`: actual retained case results and the
  execution scope label are readable with the renderer disabled. No new model call
  was made for this inspection.

The user supplies explicit cases through Mission Command. Each case gets a fresh
module worker and 1.5-second timeout. The browser is disposable, requests Chromium
sandboxing, uses no provider-key environment, blocks external requests, denies
network access via CSP and exposes no Node/filesystem bindings. Reporting uses an
unguessable per-case token and captured intrinsics; the trusted host compares results.
Code and contract sizes, case counts and serialized results are bounded. These are
bounded isolation tests, not an exhaustive sandbox/security certification or a
per-process memory quota. Passing cases do not prove arbitrary program correctness.

The real checker emits metadata-only execution/evaluation observations through the
existing Watchdog seam. Individual outcomes and the suite result are preserved;
Dojo state is derived from those actual outcomes. The checker is an explicit local
execution instance, not a claimed extra AI model. No Kujo Eval invocation is claimed
for these browser checks; the earlier Kujo Eval proof remains separate.

If a browser is unavailable or a check receipt cannot be completed, execution
coverage is UNKNOWN and checks are unavailable. Syntax-only missions remain
unexecuted. Normal local launch reuses installed Chromium when available; otherwise
install it with `npx playwright install chromium` or set `CHROMIUM_PATH`.
