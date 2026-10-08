import { expect, test } from "vitest";
import retained from "./fixtures/real-nested-artifact.json";
import { missionSource } from "../apps/runner/mission-source";
import { normalize } from "../apps/gateway/normalize";
test("mission source identity survives default/custom gateway scoping and excludes other workspaces", () => {
  for (const prefix of [undefined, "rc3-"]) {
    const wrapper = structuredClone(retained);
    const source = missionSource("mission-videoops", prefix);
    wrapper.record.attributes["kujo.producer.instance"] = source;
    for (const ref of wrapper.record.references) ref.namespace = source;
    expect(
      normalize(wrapper, 1, 1791445851524, prefix || "review-")?.source,
    ).toBe(source);
    expect(normalize(wrapper, 1, 1791445851524, "other-workspace-")).toBeNull();
  }
});
