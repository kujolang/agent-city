import { expect, test } from "vitest";
import retained from "./fixtures/real-nested-artifact.json";
import { normalize } from "../apps/gateway/normalize";
import { initialTruth, reduceTruth } from "../packages/world-core";

test("real nested Workcell export reaches semantic truth without dropping evidence", () => {
  const event = normalize(retained, 74, 1791445851524)!;
  expect(event.type).toBe("operation.finished");
  if (!("operation" in event)) throw Error("missing operation");
  expect(event.operation.metadata?.artifactRef).toBe(
    "workcell:wc-ea686aa1187c4840a3a36ee3cb5ae031:project/RELEASE-NOTES.md",
  );
  const truth = reduceTruth(initialTruth(), event);
  expect(Object.values(truth.agents)[0].operations).toHaveProperty(
    `${event.source}:${event.run.id}:${event.operation.id}:1`,
  );
  expect(event.evidence[0].recordId).toBe(retained.record.record_id);
});

test("reference allowance rejects traversal, URLs, content and unsafe non-reference metadata", () => {
  for (const value of [
    "../secret",
    "workcell:../secret",
    "a/./b",
    "/private/path",
    "a//b",
    "https://example.com",
    "a\\b",
    "a/%2e%2e/b",
    "raw prompt\ntext",
    "x".repeat(161),
  ]) {
    const wrapper = structuredClone(retained);
    wrapper.record.attributes["kujo.meta.artifactRef"] = value;
    expect(() => normalize(wrapper, 1, 1)).toThrow();
  }
  const wrapper = structuredClone(retained);
  Object.assign(wrapper.record.attributes, { "kujo.meta.tool": "a/b" });
  expect(() => normalize(wrapper, 1, 1)).toThrow("unsafe metadata");
});
