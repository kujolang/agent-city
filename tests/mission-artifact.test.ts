import { describe, it, expect } from "vitest";
import {
  artifactDownload,
  functionalSummary,
} from "../apps/web/mission-artifact";

describe("saved mission deliverables", () => {
  it("saves actual Kujo source, not built-in reviewer prose", () => {
    const artifact = {
      kind: "kujo",
      draft: "print(5)\n",
      content: "Looks correct.",
      validation: { checkedArtifact: "draft.kujo" },
    };
    expect(artifactDownload("mission-1", artifact)).toMatchObject({
      content: "print(5)\n",
      filename: "mission-1-author-draft.kujo",
    });
    expect(
      artifactDownload("mission-1", { ...artifact, draft: undefined }),
    ).toBeNull();
    expect(
      artifactDownload("mission-1", {
        ...artifact,
        content: "print(6)\n",
        validation: { checkedArtifact: "reviewed.kujo" },
      }),
    ).toMatchObject({
      content: "print(6)\n",
      filename: "mission-1-reviewed-artifact.kujo",
    });
  });
  it("preserves content bytes and refuses unknown kind or unsafe filenames", () => {
    for (const kind of ["code", "writing"])
      expect(
        artifactDownload("mission-2", { kind, content: " é\r\n\n" })?.content,
      ).toBe(" é\r\n\n");
    expect(
      artifactDownload("../escape", { kind: "code", content: "" }),
    ).toBeNull();
    expect(
      artifactDownload("mission-2", { kind: "unknown", content: "" }),
    ).toBeNull();
  });
  it("exposes unavailable checker evidence without inventing failed cases", () => {
    const text = functionalSummary({
      status: "unavailable",
      reason: "No verified results",
      diagnostic: "Chromium unavailable",
      cases: [],
    });
    expect(text).toContain("UNAVAILABLE");
    expect(text).toContain("Chromium unavailable");
    expect(text).not.toContain("FAIL");
  });
});
