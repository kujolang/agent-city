import { expect, test } from "vitest";
import { bridgeMetadata } from "../integrations/kujo/bridge";

test("SDK empty optional relationship cannot quarantine an otherwise valid observation", () => {
  expect(
    bridgeMetadata({
      relatedInstance: "",
      station: "query-terminal",
      rawPrompt: "private",
      resultCode: null,
    }),
  ).toEqual({ "kujo.meta.station": "query-terminal" });
  expect(bridgeMetadata({ relatedInstance: "source:run:reviewer" })).toEqual({
    "kujo.meta.relatedInstance": "source:run:reviewer",
  });
});
