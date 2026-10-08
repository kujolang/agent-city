import { test, expect } from "vitest";
import { assertDockerWorkcellSecurity } from "../apps/runner/docker-security";
test("rejects Desktop lacking AppArmor before model work, accepts guarded Linux engine", () => {
  expect(() =>
    assertDockerWorkcellSecurity({
      SecurityOptions: ["name=seccomp,profile=builtin", "name=cgroupns"],
    }),
  ).toThrow("AppArmor");
  expect(() =>
    assertDockerWorkcellSecurity({
      SecurityOptions: ["name=apparmor", "name=seccomp,profile=builtin"],
    }),
  ).not.toThrow();
});
test("unknown, disabled seccomp, and mismatched rootless identity cannot pass admission", () => {
  for (const v of [null, {}, { SecurityOptions: [null] }])
    expect(() => assertDockerWorkcellSecurity(v)).toThrow("UNKNOWN");
  expect(() =>
    assertDockerWorkcellSecurity({ SecurityOptions: ["name=apparmor"] }),
  ).toThrow("seccomp");
  expect(() =>
    assertDockerWorkcellSecurity({
      SecurityOptions: ["name=seccomp,profile=builtin", "name=rootless"],
    }),
  ).toThrow("rootless");
});
