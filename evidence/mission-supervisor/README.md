# Durable mission process supervision

The HTTP controller now launches a separate mission supervisor. It writes a
bounded process receipt after observing the mission process exit, even when the
controller has died. On restart, the controller first checks the normal source
receipt and then a schema/scope-qualified supervisor receipt. An observed process
failure can therefore release the queue without fabricating a workload outcome.

The controlled proof killed the HTTP controller and a real OS child, restarted
the controller, recovered FAILED for the mission process and observed busy=false.
No model or Workcell execution was used by this fault fixture. The existing full
mission contract separately proved controller death does not stop source work,
receipt reconciliation, metadata-only observation and permission checks. See
proof.json and contract.json. Unit coverage also rejects mismatched receipt scope.

If both the mission supervisor and source receipt are lost, status remains
UNKNOWN and admission stays blocked. This is not automatic recovery of arbitrary
orphan processes or Workcell containers. The explicit recover:workcell command
remains the ownership-scoped cleanup path. No source work is automatically retried.
