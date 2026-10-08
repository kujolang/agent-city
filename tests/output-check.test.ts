import { test, expect } from "vitest";
import {
  validateExpectedOutput,
  checkExpectedOutput,
} from "../apps/runner/output-check";
const evidence = {
  status: "completed",
  codeExecuted: true,
  output: "5\n",
  outputTruncated: false,
};
test("output checks require explicit execution permission and bounded text", () => {
  expect(validateExpectedOutput(undefined, "writing", false)).toBeNull();
  expect(validateExpectedOutput("", "kujo", true)).toBe("");
  for (const args of [
    ["5", "kujo", false],
    ["5", "writing", true],
    [5, "kujo", true],
    ["é".repeat(8193), "kujo", true],
  ] as const)
    expect(() => validateExpectedOutput(args[0], args[1], args[2])).toThrow();
});
test("observed exact stdout determines pass or fail, not model opinion or process success", () => {
  expect(checkExpectedOutput("5\r\n", evidence).status).toBe("passed");
  expect(checkExpectedOutput("5", evidence).status).toBe("failed");
  expect(checkExpectedOutput("6\n", evidence).status).toBe("failed");
  expect(checkExpectedOutput("", { ...evidence, output: "" }).status).toBe(
    "passed",
  );
  for (const patch of [
    { status: "unverified" },
    { codeExecuted: null },
    { output: null },
    { outputTruncated: true },
  ]) {
    const result = checkExpectedOutput("5\n", { ...evidence, ...patch });
    expect(result.status).toBe("unavailable");
    expect(result.actual).toBeNull();
  }
});
