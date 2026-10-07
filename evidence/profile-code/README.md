# Imported profile code verification — 2026-10-07

Real mission `mission-2df2972b-07ce-4b07-88e2-68afa04acbaf` used
`glm-5.3:cloud` through the local Ollama provider, with an explicit8192-token
limit. Integration Engineer generated an ES module; Code Reviewer returned a
structured corrected artifact. The actual saved artifact then executed in the
existing disposable Chromium module-worker checker. Positive, negative and zero
cases all passed. See [real proof](real/proof.json) and [artifact](real/reviewed.mjs).

This is platform execution explicitly requested by the user through a function
contract, not a capability silently granted to a PROPOSE profile. The checker has
its own `city-function-checker` profile and `function-checker` execution identity.
Three individual outcomes were observed separately from author/reviewer handoff.
No host filesystem, source credentials or external network integration is supplied
to the checker. Profiles still reject unavailable required capabilities, arbitrary
project execution and custom Kujo execution. This is not a Workcell or Kujo Eval
invocation and is never labeled as one.

The controlled proof uses synthetic model responses with actual SDK handoff and
browser execution: subtraction failed two cases; addition passed all three in a
new mission. The first failure remains retained. This controlled failure sequence
is not presented as a real model repair. The real run passed; no broad correctness
claim beyond its three explicit cases. Neither probe reran gateway/browser travel.

Full verify passed73tests/23files, types, boundaries, sevenmaps and productionbuild.
All owned proof services terminated. No long soak or sibling edits.

## Try the workflow

After importing trusted profiles and configuring the model, choose JavaScript
code in Mission Command. Select Integration Engineer and Code Reviewer under
Custom author / reviewer. Ask for an exported add(a,b) function. Expand Optional
JavaScript function checks and submit:

```json
{"exportName":"add","cases":[{"name":"positive","args":[2,3],"equals":5},{"name":"negative","args":[-4,1],"equals":-3},{"name":"zero","args":[0,0],"equals":0}]}
```

The generated artifact and actual checks are shown separately. A completed model
workflow does not mean its checks passed. Leave the contract blank to avoid code
execution. `npx tsx scripts/profile-code-proof.ts` reproduces the controlled proof;
`CITY_PROFILE_PROOF_REAL=1 npx tsx scripts/profile-code-proof.ts` uses the real
Ollama cloud model and may incur provider usage.
