/** An explicit expected stdout check; never executes generated code. */
export function validateExpectedOutput(
  value: unknown,
  kind: string,
  execute: boolean,
): string | null {
  if (value === undefined) return null;
  if (
    kind !== "kujo" ||
    !execute ||
    typeof value !== "string" ||
    Buffer.byteLength(value) > 16384
  )
    throw Error(
      "Expected output requires explicit Kujo Workcell execution and at most 16 KiB of text",
    );
  return value;
}

export function checkExpectedOutput(
  expected: string,
  record: {
    status: string;
    codeExecuted: boolean | null;
    output: string | null;
    outputTruncated: boolean;
  },
) {
  // A truncated prefix or an unverified process cannot establish a test outcome.
  const available =
    record.status === "completed" &&
    record.codeExecuted === true &&
    typeof record.output === "string" &&
    record.outputTruncated === false;
  const normalize = (value: string) => value.replace(/\r\n/g, "\n");
  return {
    schema: "agent-city.output-check.v1",
    status: !available
      ? "unavailable"
      : normalize(record.output!) === normalize(expected)
        ? "passed"
        : "failed",
    comparison: "exact stdout; CRLF normalized to LF; whitespace retained",
    expected,
    actual: available ? record.output : null,
  };
}
