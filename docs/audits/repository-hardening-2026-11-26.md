# Agent City security hardening

- Branch `codex/agent-city-security-hardening`
- Starting commit `e3f673b66874b506f8544df9bf044ff5b6d809d4` from `origin/main`
- Verified code commit `2b575d5033cdc252b3ae47a174774abe11fc7d51`
- Scope covers the local Agent City observer, mission controller, browser file boundary, installer, and CI. The standalone Software Factory is outside this repository.

Agent City uses Vite for the local UI, a Node HTTP runner for explicit mission commands, and a SQLite-backed gateway for Watchdog observations. Reviewed code execution and VideoOps rendering depend on Kujo Workcell and the configured container engine.

## Findings

| ID | Priority | Finding and evidence | Resolution |
| --- | --- | --- | --- |
| AC-01 | P0 | The local launcher passed the observer database override only to the gateway. The Vite file boundary could also miss a manually configured VideoOps file and the SQLite sidecars beside a symlink's destination. | Share the resolved database setting and deny configured private paths, canonical destinations, and sidecars. Apply the guard before proxy routing and after Vite's HTML fallback. Synthetic files exercise aliases, range requests, and resource query modes. |
| AC-02 | P0 | The runner and gateway accepted reads with no Origin header even when browser fetch metadata identified a cross-site request. The gateway also parsed its request target before the request checks and outside error handling. | Reject explicit cross-site requests and handle invalid observer request targets with HTTP 400. Same-origin browser requests and local clients without fetch metadata remain supported. |
| AC-03 | P0 | The observer accepted unlimited simultaneous event streams. Slow streams could continue holding a connection while Node drained its write buffer after removal from the subscriber set. | Cap concurrent streams at 32, destroy over-budget connections promptly, and apply the same buffer limit to event frames and heartbeats. Reuse the existing bounded replay and reset behavior. Tests cover admission and capacity reclamation. |
| AC-04 | P0 | Five workflows referenced moving checkout and upload-artifact tags. | Pin the commits that the upstream `v4` tags resolved to during review. Both action versions and all workflow inputs remain the same. |

## Coverage

| Checklist phases | Evidence and scope |
| --- | --- |
| 0–2 | Inspected the launcher, HTTP entry points, architecture checks, package lock, workflow jobs, existing verification commands, and release evidence. Shared the database setting at its source. |
| 3–4 | Reviewed Watchdog poll bounds, journal quotas, SSE replay, and slow-client handling. The change establishes the observer connection limit. Throughput and heap usage were outside the scope of measurement. |
| 5–6 | Inspected the mission continuation contract, local MCP reads, provider diagnostics, and replay output. Continuation size is capped, prior bundles stay out of recursive handoffs, and the existing compact SSE reset handles oversize replay. |
| 7–10 | Reviewed request parsing and origins, the Vite file allowlist, command admission, journal transactions, argument-vector subprocess calls, and Workcell preflight. Changes affect HTTP rejection and stream admission. Existing routes, command arguments, persistence formats, schemas, and configuration names are preserved. |
| 11–13 | Checked the npm lockfile and upstream Git references. File-boundary and local HTTP regression tests run through the existing Vitest suite. Workflow YAML was parsed locally. |
| 14–16 | Updated the installer boundary documentation. Broader documentation cleanup, renderer tuning, and removal of historical evidence were outside the security scope. |

## Compatibility and remaining verification

Clients that open more than 32 observer streams receive HTTP 503 until capacity becomes available. Clients with a large replay gap receive the existing SSE reset. Deployments using the local launcher can keep their existing database and VideoOps paths. The file guard resolves configured aliases at Vite startup.

No cross-repository change was needed. Hosted CI, live Watchdog providers, and live Docker isolation were outside this verification. See the existing release evidence for those separate qualification gates.

## Verification

Verification used Node 24.22.1, pinned dependencies from `npm ci --no-audit --no-fund`, and four Vitest workers.

| Command | Baseline | Hardened branch |
| --- | --- | --- |
| `VITEST_MAX_WORKERS=4 npm run verify` | Type check, architecture boundaries, and maps passed. 185 tests passed, two were skipped, and the browser file test encountered a loopback `ECONNRESET`. | Passed. 188 tests passed and two were skipped. The type check, architecture boundaries, maps, and production build passed. |
| `npm run build` | Passed when run independently of the failing baseline test. | Passed through `verify`. |
| `diff -qr <baseline>/dist <candidate>/dist` | The production build outputs matched byte for byte. | Same comparison. |
| `npm audit --json` | The previous audit reported zero known vulnerabilities for this lockfile. | The registry again reported zero known vulnerabilities. |
| `ruby -rpsych -e 'Dir[".github/workflows/*.yml"].each { \|path\| Psych.parse_file(path) }'` | Existing workflow inputs reviewed. | All five updated YAML files parsed. Upstream Git tag resolution matched both immutable pins. |
| `git diff --check` | Clean starting files. | Passed. |
