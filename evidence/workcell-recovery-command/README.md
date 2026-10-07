# Scoped interruption recovery

The `recover:workcell` product command was exercised after a real owned Workcell host process-group SIGKILL during a finite 20-second Kujo workload. It removed the stopped, exactly labeled container and ownership-marked workspace through Workcell's existing cleanup library. It left the prepared source receipt unchanged and retained UNKNOWN as the source outcome. No workload rerun occurred.

See [proof.json](proof.json). Private command output and the independent `city-cleanup.json` receipt are under the runtime directory named in that proof. Unit checks additionally refused active containers, foreign labels, invalid ownership and symlinked markers before mutation. Full verification passed 86 tests across 31 files, maps, architecture boundaries, typecheck and build.

This is an explicit local recovery command. Stop the owning supervisor before use. It does not automatically reconcile an interrupted mission, unblock UNKNOWN mission admission, recover a dead launcher, or certify remote cloud adapters. Those remain release work.
