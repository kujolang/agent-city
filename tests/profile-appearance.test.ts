import { expect, test } from "vitest";
import { appearance } from "../packages/renderer-pixi/appearance";
test("explicit imported profile appearances remain source-qualified and non-semantic", () => {
  expect(
    appearance("kujolang/kujo-agents:publishing-house.technical-editor-writer")
      .id,
  ).toBe("writer-v1");
  expect(
    appearance("kujolang/kujo-agents:publishing-house.copy-chief").id,
  ).toBe("reviewer-v1");
  expect(appearance("kujolang/kujo-agents:chain.integration-engineer").id).toBe(
    "coder-v1",
  );
  for (const id of [
    "Copy Chief",
    "other/catalog:publishing-house.copy-chief",
    "constructor",
    "__proto__",
    "unknown",
  ])
    expect(appearance(id).id).toBe("unknown-v1");
});
