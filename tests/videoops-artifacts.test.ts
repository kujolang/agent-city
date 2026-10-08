import { expect, test } from "vitest";
import { mkdtemp, readFile, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  saveVideoopsAttempt,
  validateVideoopsArtifacts,
  videoopsOutputs,
} from "../apps/runner/videoops-artifacts";
const bundle = () => ({
  schema: "agent-city.videoops-artifacts.v1",
  files: videoopsOutputs["creative-director"].map((path) => ({
    path,
    content: path.endsWith(".json") ? "{}" : "Original stage artifact",
  })),
});
test("stage artifacts cannot cross role, path, byte or required-output boundaries", () => {
  expect(
    validateVideoopsArtifacts("creative-director", bundle()).files,
  ).toHaveLength(5);
  for (const path of [
    "../escape",
    "/tmp/escape",
    "planning/../../escape",
    "review/approval.json",
    "planning/%2e%2e/escape",
    "planning\\escape",
  ]) {
    const value = bundle();
    value.files[0].path = path as any;
    expect(() =>
      validateVideoopsArtifacts("creative-director", value),
    ).toThrow();
  }
  const missing = bundle();
  missing.files.pop();
  expect(() => validateVideoopsArtifacts("creative-director", missing)).toThrow(
    "missing",
  );
  const large = bundle();
  large.files[0].content = "x".repeat(131073);
  expect(() => validateVideoopsArtifacts("creative-director", large)).toThrow(
    "byte limit",
  );
  const malformed = bundle();
  malformed.files[2].content = "{";
  expect(() =>
    validateVideoopsArtifacts("creative-director", malformed),
  ).toThrow("JSON");
});
test("immutable attempts preserve bytes and identity without claiming validation or approval", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-videoops-"));
  try {
    const first = await saveVideoopsAttempt({
      workspace,
      stage: "creative-director",
      attempt: 1,
      execution: "source:run:planner",
      bundle: bundle(),
    });
    expect(first.receipt.productionApproval).toBe("NOT_ESTABLISHED");
    expect(first.receipt.artifacts[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      saveVideoopsAttempt({
        workspace,
        stage: "creative-director",
        attempt: 1,
        execution: "different:run",
        bundle: bundle(),
      }),
    ).rejects.toThrow();
    const next = bundle();
    next.files[0].content = "Repaired artifact";
    await saveVideoopsAttempt({
      workspace,
      stage: "creative-director",
      attempt: 2,
      execution: "source:run:planner",
      bundle: next,
    });
    expect(
      await readFile(join(first.directory, next.files[0].path), "utf8"),
    ).toBe("Original stage artifact");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
test("symlinked stage directories never write outside the owned workspace", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "city-videoops-"));
  const outside = await mkdtemp(join(tmpdir(), "city-videoops-outside-"));
  try {
    await mkdir(join(workspace, ".videoops"));
    await symlink(outside, join(workspace, ".videoops/attempts"));
    await expect(
      saveVideoopsAttempt({
        workspace,
        stage: "creative-director",
        attempt: 1,
        execution: "source:run",
        bundle: bundle(),
      }),
    ).rejects.toThrow("Unsafe");
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
