# Managed setup with private Node/npm

The installer supplies private Node, and start.command now supports explicit
doctor, provider:codex, setup:workcell, agents:import and recover:workcell commands.
It preserves literal arguments and rejects unknown commands. Model authentication
and execution consent remain explicit; no provider is silently substituted.

CI37713823362 caught a real defect when system Node/npm were masked: fs.cp had
rewritten relative npm links to absolute bootstrap-staging links, which became
invalid after cleanup. The sentinel system npm returned73. Earlier private-Node
checks did not prove that the launcher could run without ambient npm.

The copy helper preserves relative links and repairs npm/npx to their bundled
entrypoints inside the new owned stage. This also repairs legacy dangling links
on managed update. Controlled removed-bootstrap and legacy-link tests pass, as do
93tests, types, boundaries, maps and build. Fresh four-platform CI is still pending.
Original failure: before.json. No new model task or container was run locally.
