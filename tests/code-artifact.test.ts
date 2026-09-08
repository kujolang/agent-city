import { test, expect } from "vitest";
import { mkdtemp, writeFile, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCodeArtifact, unwrapCode } from "../apps/runner/code-artifact";

test("Only a whole-response code fence is removed", () => {
  expect(unwrapCode("```js\nexport const x = 1;\n```").content).toBe(
    "export const x = 1;\n",
  );
  expect(unwrapCode("Here is code:\n```js\n1\n```").fenceRemoved).toBe(false);
});
test("Code is parsed without executing top-level side effects or imports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "city-code-check-"));
  try {
    const file = join(dir, "reviewed.mjs"),
      sentinel = join(dir, "must-not-exist");
    await writeFile(
      file,
      "```javascript\nimport {writeFileSync} from 'node:fs';\nwriteFileSync(" +
        JSON.stringify(sentinel) +
        ", 'unsafe');\nexport const x = 1;\n```",
    );
    expect(await checkCodeArtifact(file)).toMatchObject({
      syntax: "valid",
      fenceRemoved: true,
      codeExecuted: false,
      functionalTests: "not-run",
    });
    await expect(access(sentinel)).rejects.toThrow();
    expect(await readFile(file, "utf8")).not.toContain("```");
    await writeFile(file, "export function broken( {");
    expect(await checkCodeArtifact(file)).toMatchObject({
      syntax: "invalid",
      codeExecuted: false,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
