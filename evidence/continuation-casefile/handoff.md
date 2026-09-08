You are debugging a local failure captured by CaseFile.

Failure summary:
- Command: <from-log> .runtime/live-continuation.log
- Exit code: null
- Main failing area: review failure keywords and git context
- Changed files: TRY-AGENT-CITY.md, apps/web/missions.ts, evidence/missions/contract.json, evidence/visual-revision/browser.json, evidence/visual-revision/city.png, evidence/visual-revision/dispatch.png, evidence/visual-revision/dojo.png, evidence/visual-revision/library.png

Start by:
1. Reading case.json.
2. Reviewing combined.log.
3. Checking files listed in git-diff-stat.txt.
4. Re-running the reproduction command when available.
5. Fixing only the likely failure source unless evidence points broader.

Do not assume the previous agent completed the work correctly.
