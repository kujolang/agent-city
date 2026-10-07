# Workcell setup interaction proof

Run `npx tsx scripts/workcell-setup-proof.ts` with installed Chromium available.
The harness owns isolated control/Vite services on ports18998/18889 (refuses busy
ports), private state, and a deliberately nonexistent Docker socket. It configures
no model and invokes no cloud provider or container.

Actual keyboard navigation opens the setup details and invokes its authenticated
read-only endpoint. Missing command token returns403. The real Docker availability
check returns actionable SETUP REQUIRED text. Consent remains unchecked; jobs stay
empty; no mission directory is created. Screenshot inspected for readable DOM
instructions. Owned browser/services stop in finally, with bounded termination.

Full verification81tests/28files, architecture boundaries, maps, typecheck and build
passed. Subsequent proof-script typecheck passed. This verifies setup guidance and
authentication, not successful workload execution or automatic engine installation.
Result labels describe the completed check, not continuous source health.
