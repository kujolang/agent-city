# Codex connector onboarding

The installed CLI and actual connector pass a read-only fresh-configuration
transport proof: one configuration POST, authenticated alias listing, rejection of
missing credentials and browser Origin. No model was called and no account was
created, logged out or changed. The controlled City endpoint does not establish
full fresh-user task acceptance; that remains a separate release gate.

`proof.json` records the sanitized installed CLI result. This machine reports
UNKNOWN authentication because `codex login status` cannot load its user model
catalog; execution intentionally uses `--ignore-user-config`. UNKNOWN is neither
signed out nor authenticated. The earlier real reviewed-tool evidence proves the
actual subscription connector can execute here, without naming an unreported model.

Unit tests cover absent CLI, old options, signed-out, API-key, ChatGPT, configuration
error and timeout states. Arbitrary diagnostics/credentials are never returned.
Startup has bounded configuration requests and the UI model listing recognizes
only the connector alias, not actual model identity, quota or generation success.

Reproduce metadata proof: `npx tsx scripts/codex-onboarding-proof.ts`.
Read-only user check: `npm run provider:codex -- --check`.
Authentication behavior: https://learn.chatgpt.com/docs/auth
