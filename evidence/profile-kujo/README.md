# Custom Kujo author/reviewer — 2026-10-07

Real mission-91254932-2d6e-4b1b-9716-ca09e4b9395b used glm-5.3:cloud through
local Ollama with an 8,192-token output limit, imported Frontend Developer and Code
Reviewer, actual Dispatch/SDK handoff, and a successful real public Kujo MCP
catalog read. The author manifest permits Kujo Docs. The reviewer returned raw
Kujo code in its explicit cityArtifact field and commentary separately.

The saved [reviewed.kujo](real/reviewed.kujo) defines add(a,b) returning a+b and
prints add(2,3). Actual `kujo check` returned success for this final artifact.
[Proof](real/proof.json) records checkedArtifact=reviewed.kujo and
codeExecuted=false. This is syntax validation only, not execution or proof that
it printed 5. Reviewer grades remain model opinion. Separate checker lifecycle
identity is city-kujo-checker. No fresh gateway/browser travel proof this turn.

Controlled model responses, with real MCP reads and static checks, prove the
critical distinction: a valid author draft followed by an invalid reviewer
artifact fails; a subsequent valid final artifact passes. Both results remain
retained. The artifact API reports which file was checked and returns matching
content. Built-in Kujo missions retain the previous author-draft check behavior;
older validation records without checkedArtifact are displayed as author-draft
checks. No historical artifacts were rewritten.

Full verify: 73 tests in 23 files, types, boundaries, sevenmaps/build passed. The shared
JavaScript proof is rerun separately to check its existing fail/pass behavior.
No generated Kujo execution, project writes, sibling edits or long soak.

To try: import trusted profiles, choose Kujo in Mission Command, select an author
whose manifest allows Kujo Docs and a reviewer, and request the small add example.
The original draft, corrected code, model commentary and static result are distinct.
Reproduction:
```sh
CITY_PROFILE_PROOF_LANGUAGE=kujo npx tsx scripts/profile-code-proof.ts
CITY_PROFILE_PROOF_LANGUAGE=kujo CITY_PROFILE_PROOF_REAL=1 npx tsx scripts/profile-code-proof.ts
```
The first command uses synthetic model responses and real public MCP reads. The
second uses actual cloud inference. Neither runs the generated Kujo program.
