import { describe, expect, it } from "vitest";
import { validateModelConfig } from "../apps/runner/config";
describe("local model configuration transport boundary", () => {
  it("permits explicit local HTTP and remote HTTPS endpoints", () => {
    for (const endpoint of ["http://127.0.0.1:11434/v1/chat/completions", "https://provider.example/v1/chat/completions"])
      expect(validateModelConfig({ endpoint, model: "model-id", apiKey: "" }).model).toBe("model-id");
  });
  it("rejects remote cleartext, URL credentials and query-string secrets", () => {
    for (const endpoint of ["http://provider.example/v1", "https://user:secret@provider.example/v1", "https://provider.example/v1?key=secret", "file:///etc/passwd", "https://provider.example/v1#secret"])
      expect(() => validateModelConfig({ endpoint, model: "model-id", apiKey: "private" })).toThrow();
  });
  it("rejects header injection and missing model identity", () => {
    for (const data of [{ model: "", apiKey: "" }, { model: "model-id", apiKey: "key\r\nInjected: yes" }])
      expect(() => validateModelConfig({ endpoint: "https://provider.example/v1", ...data })).toThrow();
  });
});
