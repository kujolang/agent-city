import { test, expect } from "vitest";
import { validateFunctionContract } from "../apps/runner/function-check";

test("Function execution requires bounded, explicit finite JSON expectations", () => {
  for (const value of [
    null,
    {},
    { exportName: "f", cases: [] },
    {
      exportName: "f",
      cases: [{ name: "ambiguous", args: [], equals: 1, throws: "Error" }],
    },
    {
      exportName: "f",
      cases: [{ name: "nonfinite", args: [Infinity], equals: 1 }],
    },
  ]) {
    expect(() => validateFunctionContract(value)).toThrow();
  }
  expect(
    validateFunctionContract({
      exportName: "sum",
      cases: [{ name: "empty", args: [[]], equals: 0 }],
    }).cases,
  ).toHaveLength(1);
});
