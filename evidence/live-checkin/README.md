# Real model check-in — 2026-09-26

`npm run proof:checkin-live` passed against the local port-6178 application using the
configured Codex ChatGPT text adapter (not a synthetic provider).

Mission: `mission-6b682559-39b4-4851-a3d5-5821204157d3`.
Actual flow: Dispatch task → Kujo SDK coder → public Kujo MCP catalog read → model asks
“Which two numbers should the Kujo script add?” → user reply “Use 2 and 3.” → author
produces code → SDK hands off to the separate reviewer → actual Kujo static check passes.
Code was NOT executed. Review is model opinion, not a functional test result.

`proof.json` preserves the exact question, provider binding, verified outcomes, and automatic
Follow scenes (city, Workshop, MCP). Screenshots: `question.png`, `completed.png`.
No building clicks or manual Follow were used in the proof. Zero browser exceptions.
Original private artifacts remain in the local mission directory, not the public journal.
