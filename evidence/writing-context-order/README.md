# Real writing continuation — task not passed

Two new local-model writing attempts ran through the current Agent City launcher, Mission Command, Dispatch, SDK writer/reviewer handoff, canonical observation and browser truth. The task remained: three short introductory sentences using only the facts that Agent City is local, visualizes observed agent activity, and separates truth from animation.

The test copied the prior packaged local mission history into a private isolated runtime at `.runtime/writing-repair-current`; the original extraction was untouched. Both attempts continue original mission `mission-7babc419-e363-44fd-9c20-a1b411751551`. No RAG or MCP retrieval was requested for these corrections, and none is claimed. The available model was Ollama `qwen2.5-coder:1.5b-instruct` at the existing local endpoint. No model was downloaded.

## Observed outcomes

- `mission-355952e7-fee9-42a0-8f77-9b2e950fff86`: runtime completed; writer and reviewer responses recorded; final output had two sentences, Markdown headings and unsupported features. **Task failed.** Evidence in `../writing-repair/proof.json`.
- Adapter correction `82e76fb` places recorded prior context before the current conversation instead of appending the old artifact after the new reviewer draft. Full prior context is retained; no content is silently truncated or source outcome modified.
- `mission-efd95112-ec01-47d4-978e-9ba452d95e33`: same parent and current request; runtime completed with both responses recorded. Final text: “Agent City is a local platform that visualizes observed agent activity while keeping truth separate from animation.” Manual review finds only the supplied facts, but it is one sentence, not three. **Task still failed.** Evidence in adjacent `proof.json`.

These two outputs do not establish that ordering was the sole cause or that the model reliably follows constraints. Both failed drafts and the original artifact remain intact. No runtime completion is promoted to a quality pass. The writing panel now states that both factual accuracy and task constraints are unverified. The user has been asked whether to configure a stronger model; do not assume authorization to download one or repeatedly retry this workload.

The proof's initial heading classifier matched only a single `#`, missing `###` headings. It was corrected to match a heading run, and the earlier report explicitly records that correction; raw output is unchanged. The final harness selects by exact execution title rather than a role/name suffix.

Typecheck and production build passed. Both real source executions completed, their terminal state reached browser truth, and browser page-error lists are empty. These are runtime/integration passes and writing acceptance failures. Test services were shut down; no source task remains active and no soak was run. The current release and full working-experience goal remain incomplete.

The harness supports reopening an existing result with `CITY_WRITING_RESUME=<exact-id>` to avoid duplicate execution after a timeout. A fresh invocation starts a real model task and must not be used merely to regenerate screenshots. Screenshots are actual observed Workshop activity; they do not claim Library or MCP travel.
