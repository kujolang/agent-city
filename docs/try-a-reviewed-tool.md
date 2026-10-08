# Try a reviewed Kujo tool

This is a local task-and-review workflow, not a claim that the entire release
checklist is complete. You supply the model connection and explicitly enable
execution. Agent City never treats model review as a passing test.

1. Follow the [installation and model setup](../README.md). Open Mission Command,
   detect/configure Ollama or configure the Codex CLI connector, then save the
   connection. Credentials belong to that provider; local Ollama uses no API key.
2. Import the bundled profiles with `./start.command agents:import` from the
   managed installation directory. Select an eligible author/reviewer pair in
   Mission Command, such as Integration Engineer and Code Reviewer. Unsupported
   capability requirements are rejected rather than silently granted.
3. Choose **Kujo + senior review**. Attach
   [kujo-quote-tool.md](../examples/mission-briefs/kujo-quote-tool.md) under
   **Selected project files**. Enter: “Implement the attached quote-tool brief.
   Read the enabled Kujo MCP documentation, produce the requested reusable Kujo
   functions and demonstration, then hand it to the separate reviewer. Return
   the corrected source as the artifact. Do not claim tests you did not run.”
4. Expand **Tools, files and checks**, then enable the MCP documentation option. This is the supported explicit read,
   not permission to invoke arbitrary MCP tools or named external workflows.
5. For real execution, follow **Workcell execution setup** in Mission Command.
   It requires a container engine and trusted Kujo image. Enable the per-task
   **Execute checked Kujo code in Workcell** checkbox. The workspace has no
   network or access to your host project. Without this opt-in, you can still
   create and statically check the tool; execution remains unverified.
6. Enable **Check exact stdout** and enter these three lines, including a newline
   after the last line:

   ```text
   100
   25
   130
   ```

7. Start the mission. Follow a specific observed execution to see its actual
   activities across rooms. Author, reviewer and checker are distinct instances;
   select each explicitly when you want to follow that worker. Operations that
   finish before their animation are shown as RECENT.
8. Open the completed mission in history. Read the original responses, reviewed
   artifact, static-check result, Workcell receipt and output-check result.
   **Save reviewed artifact** downloads the actual `.kujo` source. The built-in
   author/reviewer path instead offers **Save author draft**, since its reviewer
   response is commentary. Completion alone does not mean the checks passed.
9. If a check fails, use the explicit continuation with the observed failure and
   ask for a correction. Re-enable Workcell execution and the output check for
   this new task. The prior attempt stays in history. UNKNOWN means no verified
   outcome; inspect diagnostics instead of treating it as success or failure.

Only attach files you intend to send to your configured model. Their content is
retained privately with the mission; telemetry contains references, not source
text. Downloads save generated artifacts locally; they do not modify your project.

For canvas-only footage, use **Record game video**, then **Stop / save video**.
Recording is a presentation action and does not delay work. Record during the
real run, or explicitly label footage from replay as replay. Keep any edits to
timing separate from the source execution evidence.
