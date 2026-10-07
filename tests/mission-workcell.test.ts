import { test, expect } from "vitest";
import { admitWorkcell } from "../apps/runner/mission-workcell";

test("Workcell requires per-mission consent and operator configuration", () => {
  const enabled = {
    CITY_ENABLE_WORKCELL: "1",
    CITY_WORKCELL_IMAGE: "trusted:local",
  };
  expect(admitWorkcell(undefined, "kujo", enabled)).toBe(false);
  expect(admitWorkcell(false, "kujo", enabled)).toBe(false);
  expect(admitWorkcell(true, "kujo", enabled)).toBe(true);
  for (const value of ["true", 1, null, {}])
    expect(() => admitWorkcell(value, "kujo", enabled)).toThrow();
  expect(() => admitWorkcell(true, "writing", enabled)).toThrow();
  expect(() => admitWorkcell(true, "kujo", {})).toThrow();
  expect(() =>
    admitWorkcell(true, "kujo", { CITY_ENABLE_WORKCELL: "1" }),
  ).toThrow();
});
