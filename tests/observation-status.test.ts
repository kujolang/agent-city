import { test, expect } from "vitest";
import {
  nativeStatus,
  reportedWorkcellFailure,
} from "../integrations/kujo/observation-status";
test("missing or interrupted Workcell evidence cannot become a workload failure", () => {
  const summary = {
    schema_version: "workcell-run-summary/v1",
    run_id: "wc-" + "a".repeat(32),
    ok: false,
  };
  const result = { code: 7, timedOut: false };
  expect(reportedWorkcellFailure(result, summary)).toBe(true);
  expect(reportedWorkcellFailure(result, undefined)).toBe(false);
  expect(reportedWorkcellFailure({ ...result, code: null }, summary)).toBe(
    false,
  );
  expect(reportedWorkcellFailure({ ...result, timedOut: true }, summary)).toBe(
    false,
  );
  expect(
    reportedWorkcellFailure({ ...result, spawnError: "ENOENT" }, summary),
  ).toBe(false);
  expect(reportedWorkcellFailure(result, { ...summary, ok: true })).toBe(false);
});
test("unknown outcomes and coverage gaps never become canonical error status", () => {
  expect(nativeStatus("gap", "unknown")).toBe("unset");
  expect(nativeStatus("finished", "unknown")).toBe("unset");
  expect(nativeStatus("finished", "failed")).toBe("error");
  expect(nativeStatus("finished", "succeeded")).toBe("ok");
});
