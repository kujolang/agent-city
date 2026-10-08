# Complete public-release checklist

The objective is the complete checklist, not a narrower preview. A checked item requires
current evidence at the advertised scope. Existing source/model/tool truth rules apply.
The user cancelled the eight-hour soak; do not run or schedule it without renewed consent.

- [x] One-command installation: pinned compatible City/Kujo producer/runtime dependencies;
      private prerequisite setup; isolated destination; failure rollback; usable launcher;
      clean-machine proof for every advertised platform; repeat/update/uninstall paths.
      Evidence: [public bootstrap](evidence/public-bootstrap/README.md),
      [four-platform maintenance](evidence/installed-maintenance/README.md),
      [fresh installed launcher/task](evidence/first-user-installed/README.md).
- [ ] Fresh-machine onboarding: prerequisite/model detection; guided Ollama/Codex setup;
      first real task → saved deliverable → separate reviewer; agent-readable instructions;
      actionable failures; no fabricated credentials or silent provider fallback.
- [ ] Custom agents and teams: import catalog profiles/skills/workflows, stable source identity,
      choose team/roles, preserve contracts and capability requirements, fail closed on missing
      permissions, prove at least code, content and one custom-team workflow.
- [ ] Broader real work: approved MCP/Ability and isolated project/Workcell execution;
      actual artifacts and checks, permission scope, interruption/resume/recovery, handoff,
      task-aware review, retained failed/repaired attempts, no business behavior in rendering.
- [ ] Reliability qualification: complete canonical→Watchdog→gateway→browser stress target;
      native hidden-tab resume; fresh bounded recovery/security/browser evidence;
      long-duration reliability remains unqualified until evidence/approved scope is resolved.
- [ ] Showcase finish and release package: visual comparison to full supplied references;
      readable compact accessible controls; current platform-qualified artifacts;
      version/integrity/provenance, installation documentation, current acceptance audit.

## Evidence checkpoints

2026-10-07: baseline npm run verify passes54tests; recorded release gateFAIL. Implementation
started on isolated pinned installation. No item above is completed by an installer script
alone. Existing art, custom-team execution, broad capabilities and reliability remain open.

2026-10-07 installer checkpoint bf80bb6: isolated local install and mission contract
passed; 57 tests pass. Public bootstrap blocked by private source distribution;
platform CI rejected before execution by billing limits. Bounded canonical pipeline
measured 164.156 events/s with no observed loss/duplicates, below target. See
[evidence and limits](evidence/release-readiness-20261007/README.md).

Managed maintenance checkpoint: update stages/builds before replacement, preserves
.runtime at its original path and retains a full rollback archive; uninstall archives
all data. Managed startup/maintenance use an exclusive lease. Local real update,
HTTP startup, live uninstall refusal, shutdown and archive uninstall verified; all
105 pre-existing runtime files preserved byte-for-byte. Cross-platform and public
distribution qualification remain open. See installer/README.md and maintenance.json.

Model onboarding checkpoint: authenticated metadata-only local Ollama discovery,
installed-model selection, explicit listing check and Codex login/adapter guidance.
Real browser detected three installed models; listing check passed and missing-token
request returned403. Full verify64tests passes. Complete fresh-machine onboarding
and real first-task/reviewer qualification remain open.

Catalog checkpoint: all85 canonical registry profiles import with private contracts,
content hashes, permission limits, capabilities, tool/workflow references and a
read-only team browser. Profile execution remains NOT_CONNECTED; custom-team
mission execution is still required before completing that checklist item.

Profile execution checkpoint:51 profiles eligible for bounded PROPOSE draft/review;
required capability/permission checks reject unsupported combinations. Per-mission
contracts survive catalog removal on continuation. Real Ollama SDK handoff and
Watchdog→gateway→browser profile identity proved. Output-quality check failed on
the small model; cloud corrective reviewer failed, with both attempts retained.
Full custom workflows/tools and accepted-quality custom-team proof remain open.

Provider recovery checkpoint: reproduced HTTP200/finish=length/zero-content at
2048 tokens; explicit8192 recovered the same profile workflow. Corrected section
passes source checks and actual kujo check; whole response includes additional
review notes. Metadata-only diagnostics, bounded configurable limits and truncated
response failure are implemented. Broad model/task quality remains unqualified.

Canonical concurrency checkpoint: repaired overlapping disk-backed Watchdog SQLite
transactions; regression, canonical API/privacy/identity and mirror checks pass.
Bounded pipeline delivered5,800/5,800 with zero duplicates, but139.92/sec remains
below target. VM probe timed out and is unqualified; production stays interpreter.
See [scope and evidence](evidence/canonical-concurrency/README.md).

Native visibility checkpoint: installed Chrome154 passed an actual short hidden/
visible tab cycle, truth ingestion while hidden, paused animation, collapsed
backlog and retained selected identity. Release assessment now consumes/asserts
that evidence. Long throttling, OS sleep/tab discard and live-source suspension
remain outside this controlled1.2second test. See evidence/browser-visibility.

Viewport checkpoint: full canvas now scales2x in600px-high desktop windows,
rather than reserving420px for surrounding panels. Five-width keyboard/reduced-
motion proof passes with full canvas visible, retained truth/identity and zero
horizontal overflow, including320px. Reference-art acceptance remains open.

Custom documentation checkpoint: eligible imported authors may explicitly request
read-only RAG/MCP documentation context only when their manifest allows Kujo Docs.
Real Ollama glm-5.3:cloud → Dispatch/SDK → real MCP README read → reviewer handoff
completed; lifecycle metadata retains author profile. Controlled context/privacy/
unauthorized-read tests passed; full verify73tests passes. General tools, custom
named workflows and execution remain unconnected; whole-artifact output formatting
still unqualified. See evidence/profile-missions/docs-real.

Reviewer artifact checkpoint: custom reviewers return explicit artifact/commentary
fields. Runtime saves them separately and rejects malformed output without an
artifact-created event. Real glm-5.3:cloud/MCP/profile handoff produced an accepted
brief source-grounded documentation artifact, with review findings kept private
and separate. Controlled rejection proof and full verify pass. This qualifies that
specific writing example; general model quality/custom workflows remain open.

Custom code checkpoint: explicit user-supplied JavaScript cases now run after
custom PROPOSE author/reviewer handoff under the separate isolated checker identity.
Real Integration Engineer→Code Reviewer using glm-5.3:cloud generated code that
passed three actual browser-worker cases. Controlled bad/repaired outputs retain
both results. Full verify passes. General Workcell/project execution, named
workflows and custom Kujo execution remain incomplete. See evidence/profile-code.

Custom Kujo checkpoint: authors with explicit Kujo Docs permission can produce
reviewer-corrected Kujo artifacts after the real public MCP read. Static validation
now identifies reviewed.kujo for these missions; built-in author-draft behavior
is preserved. Real cloud author/reviewer/check passed. Controlled invalid-final/
repaired-final checks retain both outcomes. Generated Kujo execution and broader
Workcell/workflow scope remain open. See evidence/profile-kujo.

Workcell local execution checkpoint: dedicated Colima with enforced protections
ran a real generated/reviewed Kujo program, exported5, verified receipts and
cleaned up. Original mount failure retained. Host1.7/container1.5 scope and
CLI-only limits are explicit; general Mission Command Workcell remains open.
See [execution evidence](evidence/workcell-live/README.md).

Workcell admission hardening: success now requires a matching verified/cleaned
receipt and real bounded artifact files; each export has evidence. Host commands
have bounded waiting, and timeout cleanup stays UNKNOWN. Rejection/timeout tests
and retained real-run artifact validation pass. Integrations now participate in
TypeScript checking. Mission Command Workcell integration remains incomplete.

Mission Workcell checkpoint: explicit per-request opt-in plus operator enable/image
configuration executes checked Kujo code in a separate no-network generated
workspace after review. Real mission-e58374b0-73ce-41b2-aab7-a46b9575081b used
cloud author/reviewer, actual MCP and handoff, then exported5 from Workcell.
Private artifact inspection reports receipt/hashes/runtime/output; telemetry stays
metadata-only. General project execution and interrupt/resume remain open. See
[evidence and operator setup](evidence/mission-workcell/README.md).

Workcell browser checkpoint: retained real artifact/output/cleanup render through
the local API. Keyboard consent, submission reset and follow-up reset verified
in installed Chromium; consent no longer carries into another task. Screenshots
in evidence/mission-workcell/browser. No new model/container activity or world
travel claimed by this UI proof.

Workcell recovery checkpoint: atomic pending/final records and history-scoped
read-only receipt recovery expose verified execution independently of UNKNOWN
mission status. Controlled checkpoint loss over copied real receipts recovers5
without modifying records or executing work. Live interruption/cleanup and world
traversal remain unqualified.

Repair-context checkpoint: follow-up author/reviewer receive retained Kujo static
validation and Workcell results/evidence, including unknown/failure state. Real
output5 context verified without mutating its source or inheriting execution
permission. This does not qualify a new live repair run or interruption gate.

Workcell world checkpoint: authored bay replaces legacy unavailable station;
invocation waits, verified completed work animates RECENT, failure alerts.
Deterministic station/identity/replay checks pass. Full verification79tests; no
fresh end-to-end live Workcell browser traversal claimed.

Fresh Workcell world checkpoint: actual generated Kujo execution exported5;
lifecycle→Watchdog canonical→gateway/SSE→Pixi passed. Exact instance remained
followed at upper Workshop bay, success and both artifact observations retained.
Screenshot and receipt-linked truth in evidence/mission-workcell/live-world.
Live interruption/cleanup fault injection and broader work/release gates remain.

Gateway-outage checkpoint: real Workcell completed with gateway stopped; browser
reported STALE, then recovered LIVE truth and both artifacts after restart.
Exactly one source run, output5, ordered timestamps retained in
evidence/mission-workcell/gateway-outage/proof.json. This qualifies gateway outage
independence, not source/container interruption or Watchdog outage.

Watchdog-outage checkpoint: real Workcell completed while canonical intake was
stopped; durable local spool recovered6/6unique evidence references after restart,
with1source run and browser STALE→LIVE. Evidence in
evidence/mission-workcell/watchdog-outage/proof.json. Source interruption, overflow
and remaining broader release requirements remain unqualified.

Operator-cancellation checkpoint: real owned running container cancelled via
Workcell hook; retained failure, no success artifact, container/workspace cleanup
verified. A small Workcell ProcessResult field-access bug was found and fixed;
original misclassified attempt retained. Hard process-death recovery and broader
release requirements remain open. See evidence/mission-workcell/cancellation.

Additional release gate: Workcell official cloud-adapter release candidate fails
its dependency audit (6 high,1 critical). Findings retained in
evidence/mission-workcell/cancellation/optional-adapters-audit.json; exploitability
and reachability remain unassessed. Local Docker cancellation passes independently.

Cloud-adapter audit remediation: compatible locked shell-quote, grpc-js and
brace-expansion updates remove the critical finding and two high findings. Four
high findings remain in Daytona's fast-glob/micromatch/braces chain; upstream
braces has no patched version. No audit exceptions or gate weakening applied.
See ../workcell/evidence/adapter-dependency-audit-20261007 for current evidence.
Producer commit a276a92: integrity and25JS tests pass,249release-report assertions
pass; offline Kujo conformance rerun passes6checks. Initial unexplained Daytona
failure retained in CaseFile2026-10-07-170340-adapterconformance.

Installer Workcell checkpoint: the managed source lock now includes Workcell
a276a92, and validates exact required producer identities rather than only count.
Fresh isolated macOS installation downloaded pinned sources and built successfully;
installed Kujo1.7/Workcell1.2 CLI and native cancellation regression passed. No
cloud dependencies, execution enablement, credentials or missions were installed
or started. Evidence: evidence/installer-workcell/proof.json. This does not qualify
container engine/image provisioning, clean machines or other platforms.

Workcell admission checkpoint: explicit execution requests now check local source,
engine connection and image before mission creation/model calls. Actual runner HTTP
with a deliberately unavailable Docker endpoint returned400, with zero model calls,
zero jobs and no mission directory. Read-only checks never pull/start containers.
Evidence: evidence/workcell-preflight/proof.json. Engine/image installation and
full fresh-machine first-task qualification remain open.

Workcell setup UI checkpoint: authenticated read-only check is now available in
Mission Command before model configuration. Chromium keyboard proof against an
unavailable private Docker endpoint shows actionable setup instructions, unchanged
execution consent and no jobs. Evidence: evidence/workcell-setup. No automatic
engine/image provisioning or expanded execution permission is implied.

Local image setup checkpoint: npm run setup:workcell -- --build creates a local
non-root image from a pinned base digest and locked Kujo1.7runtime, using only a
three-file temporary context. It prints an immutable-image-ID launch command and
does not enable execution. Actual Linux AMD64 build and Workcell execution produced5,
verified cleanup and6canonical observations, with browser Follow into Workshop bay.
Evidence: evidence/workcell-image. ARM64 and clean-machine/engine provisioning
remain unqualified. Earlier installer scope text corrected to macOS x64 to match
its original receipt; no ARM installation claim is supported by that proof.

Mission recovery validation checkpoint: malformed failed receipts no longer turn
UNKNOWN into FAILED merely because a code is absent/notzero. Bounded read validates
explicit terminal metadata; controlled HTTP restart/corruption proof and retained
real completed receipt pass without mutation or source execution. Evidence in
evidence/mission-recovery-validation. Live process-death/orphan cleanup still open.

Source interruption checkpoint: real owned Workcell host process-group death now
produces a disconnect coverage gap, not a fabricated workload failure. Actual
Watchdog export→normalizer→truth reducer preserves partial coverage and UNKNOWN
workload outcome. Exact owned container/workspace cleanup passed separately; the
prepared source receipt remains unchanged and no source rerun occurred. Full verify
85tests passes. Evidence: evidence/workcell-interruption. Automatic orphan recovery,
general crash recovery and remaining release categories are still open.

Scoped recovery command checkpoint: recover:workcell replaces bespoke harness
cleanup with a product command using exact container labels/IDs, workspace marker
validation and Workcell's ownership-checked library. Real source SIGKILL proof
passed; active/foreign/symlink refusal tests and full verify86tests pass. Original
receipt/outcome remain unchanged. Automatic mission reconciliation and admission
recovery remain open. See evidence/workcell-recovery-command.

Clean Linux checkpoint: fresh pinned Node24/LinuxAMD64 container downloaded and
installed pinned dependencies, built City and passed the installed mission
contract suite. No host npm cache or private model credentials supplied. Scope
excludes public bootstrap, real model onboarding, desktop browser and nested
sandbox execution. Evidence: evidence/linux-install. Platform CI remains rejected
before steps by billing/spending limits (run37691817210).

Bundle contents correction: source bundles now include Workcell and the installer
module required by managed startup. Previously the older bundle recipe omitted
both despite later application dependencies. Package verification remains required.

Release qualification checkpoint: current bounded canonical pipeline delivered
26,200/26,200 events without observed loss/duplicates at285.199events/sec; the
1,000/sec gate remains failed. Corrected local preview package integrity passes
with producer pins matching the installer. Local ShipCheck metadata gate passes
with5warnings; connected service unavailable. All five release workstreams remain
partially complete; final real-tool game recording is queued after qualification.
See evidence/release-readiness-current and evidence/release-package-current.

Public bootstrap checkpoint: user authorized public visibility; repository is
public and billing no longer blocks CI. Run37704210809 passed private-Node
bootstrap plus installed contracts on Linux x64/ARM64 and macOS Intel/ARM64.
Evidence: evidence/public-bootstrap. This supersedes private-distribution and
CI-start blockers, not model/sandbox onboarding or full release readiness.

Mission supervision checkpoint: independent observed process-exit receipt now
survives HTTP-controller death. Controlled restart recovered FAILED and released
the queue without rerunning work or fabricating workload truth. Full verify88tests
passes. Both-supervisor-and-source-evidence loss still remains UNKNOWN; explicit
owned Workcell cleanup is separate. Evidence: evidence/mission-supervisor.

Fresh installed-app model checkpoint: a new managed destination started unconfigured;
actual UI detection/selection of existing Ollama glm-5.3:cloud and explicit8192 token
limit completed a real writing→separate-reviewer mission. Follow visited Workshop,
Library and MCP. Saved output and two observed responses are retained in
[evidence/first-user-installed](evidence/first-user-installed/README.md). This proves
first-task setup against an existing authenticated Ollama installation, not fresh
OS/provider installation, general team workflows or full release readiness.

Canonical intake checkpoint: Watchdog native serializer/default-redaction matching
passes compatibility/privacy regressions; installer now pins2066fd8. Latest bounded
pipeline24,800/24,800,zero missing/duplicates,271.488events/sec still FAILS the
1,000/sec gate. This does not establish a speedup under variable host load. See
evidence/canonical-intake-profile. No eight-hour soak was run.

Installed maintenance checkpoint: run37707496087 at4f3af6c passed real updates,
repeat-install and active-lease refusal, failed-preparation preservation, archive
uninstall/restoration, and private Node retention on Linuxx64/ARM64 and
macOSIntel/ARM64. Local actual model-installation maintenance preserved106files.
Evidence: evidence/installed-maintenance. This closes cross-platform maintenance
qualification; provider/sandbox setup and remaining release categories stay open.
