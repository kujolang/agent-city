import { expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { providerDiagnostics } from "../apps/runner/provider-diagnostics";
import { validateModelConfig } from "../apps/runner/config";
test("provider diagnostics retain length/empty-output evidence while excluding unknown payload fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "city-diagnostic-"));
  const id = "mission-11111111-1111-1111-1111-111111111111";
  try {
    await mkdir(join(root, id));
    const row = {
      schema: "agent-city.provider-diagnostic.v1",
      agent: "reviewer",
      run: "run-1-handoff-reviewer",
      httpStatus: 200,
      finishReason: "length",
      contentCharacters: 0,
      requestedMaxTokens: 2048,
      reasoningPresent: true,
      occurredAtMs: 1,
      prompt: "private-prompt",
      reasoning_content: "private-reasoning",
      authorization: "private-key",
    };
    await writeFile(
      join(root, id, "provider-diagnostics.jsonl"),
      JSON.stringify(row) + "\n",
    );
    const result = await providerDiagnostics(root, id);
    expect(result.complete).toBe(true);
    expect(result.records[0].finishReason).toBe("length");
    expect(result.records[0].contentCharacters).toBe(0);
    expect(JSON.stringify(result)).not.toContain("private-");
    await writeFile(join(root, id, "provider-diagnostics.jsonl.gap"), "gap");
    expect((await providerDiagnostics(root, id)).complete).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("output budget is explicit, bounded and backwards compatible", () => {
  const base = {
    endpoint: "http://127.0.0.1:11434/v1/chat/completions",
    model: "model",
    apiKey: "",
  };
  expect(validateModelConfig(base).maxOutputTokens).toBe(2048);
  expect(
    validateModelConfig({ ...base, maxOutputTokens: 8192 }).maxOutputTokens,
  ).toBe(8192);
  for (const maxOutputTokens of [0, 255, 16385, 1.5, "8192", NaN])
    expect(() => validateModelConfig({ ...base, maxOutputTokens })).toThrow(
      "limit",
    );
});
