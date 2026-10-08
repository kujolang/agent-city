# Current local preview archive

Built from City39ee285 with pinned producers and an explicitly verified existing
macOS x64 runtime. This is a local preview, not a signed/published production
release. [proof.json](proof.json) contains the exact archive path, SHA256,
source commits and3,307-file integrity result. The archive is25,683,283bytes.

The packaging script now includes docs/try-a-reviewed-tool.md and the current
release checklist. Producer directories come from `git archive` at the lockfile
commits, so unrelated sibling working-tree edits neither enter the archive nor
block export. The Watchdog dashboard file was compared byte-for-byte with its
pinned commit; private watchdog_proxy_config.json is absent. No sibling edit was
committed, stashed, reset or copied into the archive.

Inside this archive, npm ci, verify:bundle and [doctor](doctor.log) pass.
The [controlled mission contract](contract.log) passes using the packaged
SDK/Dispatch/RAG/MCP/runtime: start-before-completion, handoff, task propagation,
real local RAG/MCP and failure/continuation constraints. The model is deliberately
controlled; this is packaging verification, not the final live tool/video proof.
The earlier fresh-user live model evidence remains separate.

Initial verification located a previously moved runtime bundle via its old
receipt path, then retried from its current verified location. A concurrent docs
edit was correctly rejected by the clean-Agent-City check before archive creation.
The successful archive was produced only after committing the documentation.
No failed archive was distributed. Public installer CI37742020495 at5ded1a3
passes all5jobs, including the four supported platform installs.
