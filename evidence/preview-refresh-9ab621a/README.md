# Superseded preview verification attempt

Preview source 9ab621ab26f7d5b3920ff32119d59fe5facbfeba, archive SHA256 b281caa47c3d21a3b77e349ff600569529f71b8ccce9749eabb0010e26868740, 16,909,581 bytes, 1,157 manifest files.

Fresh installation, manifest verification, TypeScript and build passed. Synthetic mission contract failed at scripts/mission-contract.ts:342: `Cannot read properties of undefined (reading 'messages')`. The writing job completed; the subsequent code job failed before a third provider request existed. Owned jobs metadata recorded mission-1def1ca8-ecc4-46f3-b535-e1a5bb0f4a3a accepted 2026-09-08T19:26:20.766Z and failed 19:26:20.773Z, with no mission directory. The previous runner discarded process error metadata, so the cause cannot be established from retained evidence. Host resource pressure is a hypothesis, not a finding.

76914dd adds bounded spawn/exit metadata and an explicit provider-request assertion. A subsequent source contract completed all six synthetic provider calls successfully; this does not retroactively identify the earlier failure. This preview also predates the private-file-serving fix and is obsolete. Use the newly verified preview instead.
