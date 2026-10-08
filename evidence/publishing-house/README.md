# Real Publishing House acceptance attempts

These are real requests through the owned managed City installation, not fixture
responses. Imported profiles are Technical Editor & Writer and Copy Chief from
pinned kujo-agentsbe22fda. Both run in the bounded PROPOSE draft/review adapter;
no external named workflow, publishing or unrequested tool execution is implied.

The task is a70–100word introduction with three bullets using five supplied facts.
All failed attempts remain in the local history and these metadata receipts:

| Attempt | Model | Limit | Outcome |
| --- | --- | --- | --- |
| 1 | glm-5.3:cloud |8192tokens,90seconds | Author HTTP200, finish=length, zero usable text; failed |
| 2 | glm-5.3:cloud |16384tokens,90seconds | Author returned510characters; reviewer returned no HTTP response after the bounded wait; failed handoff |
| 3 | glm-5.1:cloud |8192tokens,90seconds | Listed by Ollama but rejected with HTTP410; failed before drafting |

No provider fallback was automatic. Each setting/model change was explicit in the
browser proof. A listed model is not a guarantee that the provider will serve it.
CaseFile for the initial failure:2026-10-07-225536-publishingprovideroutputlimit.
A fourth qualification with explicitly increased180-second wait is recorded separately.

Attempt4 (`mission-52595e4d-55d5-48ce-a195-21f90f14eec6`) with16384tokens and180seconds returned both author and reviewer text, but FAILED: the SDK default120-second reviewer deadline rejected the138-second response after the HTTP call. The source overlay is explicitly recorded; this was not a clean released installation. No completed artifact or passing handoff is claimed for that attempt. City now supplies bounded SDK deadlines covering its provider calls and enabled user check-ins; no SDK source change is needed.

Attempt5 PASS: `mission-d0549650-c62a-4626-845b-e1bfb033c692` with the aligned SDK deadlines completed both actual model calls, SDK handoff and canonical browser identities. The saved introduction has75body words, the required title and3bullets, with review commentary separated. Two observed instances retain the exact imported profile IDs. No generated-code execution, named external workflow or publication occurred. `completed.png` is a read-only refreshed capture after the mission-history poll reached completed; it retains the honest partial-coverage flag from the owned stack restart. Earlier failed runs remain visible. Both artifact and bounded runtime acceptance pass for this task, not arbitrary writing quality.
