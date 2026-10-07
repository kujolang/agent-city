import { expect, test } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  importCatalog,
  saveCatalog,
  catalogSummary,
} from "../apps/runner/agent-catalog";
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "city-catalog-"));
  await mkdir(join(root, "team/author"), { recursive: true });
  const entry = {
    id: "team.author",
    name: "Author",
    path: "team/author",
    package: "team",
  };
  const registry = {
    schema: "kujo.agent.registry/v1",
    agent_count: 1,
    agents: [entry],
  };
  const manifest = {
    schema: "kujo.agent.manifest/v1",
    id: entry.id,
    name: entry.name,
    version: "1",
    contract: { agent: "AGENT.md", skill: "SKILL.md" },
    permissions: {
      minimum: "OBSERVE",
      maximum: "PROPOSE",
      enforcement: "runtime-adapter",
    },
    capabilities: { required: ["filesystem"], recommended: [], optional: [] },
    tools: { allowed: ["Spec"] },
    workflows: ["draft-review"],
  };
  await writeFile(join(root, "agent-registry.json"), JSON.stringify(registry));
  await writeFile(
    join(root, "team/author/manifest.json"),
    JSON.stringify(manifest),
  );
  await writeFile(join(root, "team/author/AGENT.md"), "private role guidance");
  await writeFile(join(root, "team/author/SKILL.md"), "private skill guidance");
  return {
    root,
    registry,
    manifest,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}
test("import retains immutable contract evidence and never grants declared capabilities or broadcasts contract text", async () => {
  const f = await fixture();
  try {
    const catalog = await importCatalog(f.root);
    expect(catalog.profiles[0].id).toBe("kujolang/kujo-agents:team.author");
    expect(catalog.profiles[0].source.agentHash).toMatch(/^[a-f0-9]{64}$/);
    const file = join(f.root, "state/catalog.json");
    await saveCatalog(file, catalog);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    const summary = await catalogSummary(file);
    expect(summary.profiles[0].executionStatus).toBe("NOT_CONNECTED");
    expect(summary.profiles[0].unavailableRequiredCapabilities).toEqual([
      "filesystem",
    ]);
    expect(JSON.stringify(summary)).not.toContain("private role guidance");
    expect(JSON.stringify(summary)).not.toContain("private skill guidance");
    expect(await readFile(file, "utf8")).toContain("private role guidance");
  } finally {
    await f.cleanup();
  }
});
test("duplicate identities and mismatched manifest identity fail closed", async () => {
  const f = await fixture();
  try {
    f.registry.agents.push(f.registry.agents[0]);
    f.registry.agent_count = 2;
    await writeFile(
      join(f.root, "agent-registry.json"),
      JSON.stringify(f.registry),
    );
    await expect(importCatalog(f.root)).rejects.toThrow("duplicate");
    f.registry.agents.pop();
    f.registry.agent_count = 1;
    await writeFile(
      join(f.root, "agent-registry.json"),
      JSON.stringify(f.registry),
    );
    f.manifest.id = "other";
    await writeFile(
      join(f.root, "team/author/manifest.json"),
      JSON.stringify(f.manifest),
    );
    await expect(importCatalog(f.root)).rejects.toThrow("identity");
  } finally {
    await f.cleanup();
  }
});
test("symlink contract escaping the imported repository is rejected", async () => {
  const f = await fixture();
  const outside = await mkdtemp(join(tmpdir(), "outside-catalog-"));
  try {
    await writeFile(join(outside, "secret"), "must not import");
    await rm(join(f.root, "team/author/AGENT.md"));
    await symlink(
      join(outside, "secret"),
      join(f.root, "team/author/AGENT.md"),
    );
    await expect(importCatalog(f.root)).rejects.toThrow("escapes");
  } finally {
    await f.cleanup();
    await rm(outside, { recursive: true, force: true });
  }
});
