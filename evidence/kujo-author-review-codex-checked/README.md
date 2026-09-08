# Real Kujo author, MCP and senior review

Mission `mission-42cf14f1-9892-4cc7-b952-e603a7721061` used the installed Codex CLI
0.144.4 with forced ChatGPT authentication through the local text-provider adapter.
No OAuth file or OpenAI API key was copied. Author and reviewer are separate Kujo
SDK execution instances; each received its own Codex invocation. This does not
import arbitrary Codex tools or custom team definitions.

The live public `https://mcp.kujolang.ai/mcp` call used `get_catalog_item` with
`slug: kujo`; source health identified `kujolang-mcp`. Watchdog/gateway preserved
the real invocation and successful SDK handoff. Browser Follow observed Workshop,
city and MCP scenes without changing execution identity. `proof.json` includes
the normalized truth, actual responses and private demo artifact content, with
zero browser errors. Only these deliberately requested demo responses are
published here; general mission contents remain in private runtime storage.

Draft:

```kujo
func add(a, b) {
  return a + b
}
print(add(2, 3))
```

The senior reviewer gave an A. This is explicitly a model opinion. Independently,
`kujo check draft.kujo --quiet` passed, with metadata-only `kujo.check` lifecycle
observations represented as evaluation activity. No generated program executed;
functional tests remain not-run. Raw draft and senior review remain separate.

Retained earlier attempts:

- `../kujo-author-review/proof.json`: real Ollama pipeline completed but its draft
  was invalid and the reviewer returned UNKNOWN. It is not a successful task.
- `../kujo-author-review-codex/proof.json`: first real Codex draft was valid, but
  review incorrectly demanded semicolons. Multiline verified source guidance
  corrected that misleading cue. The original C review remains retained.

`provider-guards.json` records denied unauthenticated/browser-origin requests and
rejection of an empty request without model invocation. Direct Node typecheck,
production build and 52 tests passed. An npm shell-spawn EAGAIN failed on this busy
host before the direct Node build passed; no host-load performance claim follows.

Reproduce only intentionally (uses subscription capacity): start the local app
on 6178, run `npm run provider:codex`, then
`CITY_DEMO_CODEX=1 node --import tsx scripts/kujo-mission-proof.ts`.
The 80-second provider bound is per call; the mission diagnostic is bounded to
four minutes. No soak was run. The public MCP catalog supplies project metadata,
not language syntax verification or privileged execution.
