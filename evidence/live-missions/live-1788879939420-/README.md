# Real mission continuation and repair

Real local Ollama `qwen2.5-coder:1.5b-instruct` requests, SDK reviewer handoffs,
Dispatch lifecycle, Watchdog/gateway observation, and browser mission controls.
This is not a synthetic model fixture.

| Mission | Actual result |
| --- | --- |
| `mission-9d550c21-1c52-4bc6-8f61-2582104650f0` | Writing/review with real RAG and explicit MCP read completed |
| `mission-f1a2ab98-3e93-4ee3-b230-8a978586f17d` | Root code mission completed; functional checks failed |
| `mission-d16b90e7-ffc8-4f18-a297-98383abaf5a1` | First follow-up completed; all four checks failed, missing export |
| `mission-3aefac0f-70f0-49f0-bf05-5b929fca644e` | Second follow-up completed; all four checks failed, missing export |
| `mission-dd3d2447-d2f2-4bd1-b009-d4b5b4bfd592` | Targeted export correction completed; four checks passed |

Final parent is `mission-3aefac0f-70f0-49f0-bf05-5b929fca644e`; root remains
`mission-f1a2ab98-3e93-4ee3-b230-8a978586f17d`. The browser's Continue / repair
control submitted the new request with the real prior output/check results and
visible copied cases. Previous RAG/MCP options were not silently reused.

`continuation-output.png` shows the actual final request/output and result.
Per-mission JSON receipts preserve each attempt; `continuation.json` points to
the latest. `proof.json` records five persisted missions and fourteen semantic
instances (ten model executions and four explicit non-AI checkers).

The small model required a focused instruction to add the missing export even
after receiving the explicit case contract. Completion is not output correctness.
The collection is LIVE with a retained observation gap after proof service restarts;
do not use this run to claim gap-free operation or release readiness.

`../../continuation-casefile/` contains reviewed Casefile log-import evidence for
the first failed continuation, ID `2026-09-08-112123-citycontinuationmissingexport`.
Import did not re-execute the model. Casefile's unknown exit/high severity labels
are import heuristics, not a current unresolved production incident assessment.

Verification: 36 unit tests, typecheck, boundaries, authored maps/build, controlled
source contract and seven-room/keyboard/320px/DOM-only browser proof passed.
The controlled provider and continuation UI fixture are separate evidence.
