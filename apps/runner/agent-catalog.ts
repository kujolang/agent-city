import {
  readFile,
  realpath,
  stat,
  mkdir,
  writeFile,
  rename,
  rm,
} from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const levels = ["OBSERVE", "PROPOSE", "ACT"];
export interface ImportedProfile {
  id: string;
  sourceId: string;
  name: string;
  team: string;
  version: string;
  permissions: { minimum: string; maximum: string; enforcement: string };
  capabilities: {
    required: string[];
    recommended: string[];
    optional: string[];
  };
  tools: Record<string, string[]>;
  workflows: string[];
  source: {
    repository: string;
    path: string;
    manifestHash: string;
    agentHash: string;
    skillHash: string;
  };
  contracts: { agent: string; skill: string; manifest: unknown };
}
export interface AgentCatalog {
  schema: "agent-city.agent-catalog.v1";
  importedAt: string;
  source: { repository: string; registryHash: string };
  profiles: ImportedProfile[];
}
function texts(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 200 ||
    value.some((x) => typeof x !== "string" || !x.trim() || x.length > 256)
  )
    throw Error(`Invalid ${label}`);
  return value as string[];
}
async function sourceText(root: string, path: string, limit: number) {
  if (isAbsolute(path) || path.includes("\\"))
    throw Error("Catalog path must be relative");
  const file = await realpath(resolve(root, path));
  const rel = relative(root, file);
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel))
    throw Error("Catalog path escapes source root");
  const info = await stat(file);
  if (!info.isFile() || info.size > limit)
    throw Error("Catalog file exceeds limit or is not a regular file");
  const value = await readFile(file, "utf8");
  if (Buffer.byteLength(value) > limit)
    throw Error("Catalog file exceeds limit");
  return value;
}
export async function importCatalog(sourceRoot: string): Promise<AgentCatalog> {
  const root = await realpath(sourceRoot);
  const raw = await sourceText(root, "agent-registry.json", 512 * 1024);
  const registry = JSON.parse(raw);
  if (
    registry.schema !== "kujo.agent.registry/v1" ||
    !Array.isArray(registry.agents) ||
    registry.agents.length > 500 ||
    registry.agent_count !== registry.agents.length
  )
    throw Error("Invalid agent registry");
  const seen = new Set<string>();
  const profiles: ImportedProfile[] = [];
  for (const entry of registry.agents) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(entry.id) ||
      seen.has(entry.id) ||
      typeof entry.path !== "string" ||
      typeof entry.package !== "string"
    )
      throw Error("Invalid or duplicate registry identity");
    seen.add(entry.id);
    const rawManifest = await sourceText(
      root,
      join(entry.path, "manifest.json"),
      128 * 1024,
    );
    const manifest = JSON.parse(rawManifest);
    if (
      manifest.schema !== "kujo.agent.manifest/v1" ||
      manifest.id !== entry.id ||
      manifest.name !== entry.name ||
      typeof manifest.name !== "string" ||
      manifest.name.length > 200 ||
      typeof manifest.version !== "string" ||
      !manifest.contract ||
      typeof manifest.contract.agent !== "string" ||
      typeof manifest.contract.skill !== "string"
    )
      throw Error(`Invalid manifest identity: ${entry.id}`);
    const permission = manifest.permissions;
    if (
      !permission ||
      !levels.includes(permission.minimum) ||
      !levels.includes(permission.maximum) ||
      levels.indexOf(permission.minimum) > levels.indexOf(permission.maximum) ||
      permission.enforcement !== "runtime-adapter"
    )
      throw Error(`Unsupported permission contract: ${entry.id}`);
    const capabilities = {
      required: texts(manifest.capabilities?.required, "required capabilities"),
      recommended: texts(
        manifest.capabilities?.recommended,
        "recommended capabilities",
      ),
      optional: texts(manifest.capabilities?.optional, "optional capabilities"),
    };
    const workflows = texts(manifest.workflows, "workflows");
    if (
      !manifest.tools ||
      typeof manifest.tools !== "object" ||
      Array.isArray(manifest.tools)
    )
      throw Error("Invalid tools");
    const tools: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(manifest.tools)) {
      if (!["allowed", "primary", "secondary"].includes(key))
        throw Error("Unknown tool contract");
      tools[key] = texts(value, "tools");
    }
    const agent = await sourceText(
      root,
      join(entry.path, manifest.contract.agent),
      64 * 1024,
    );
    const skill = await sourceText(
      root,
      join(entry.path, manifest.contract.skill),
      64 * 1024,
    );
    profiles.push({
      id: `kujolang/kujo-agents:${entry.id}`,
      sourceId: entry.id,
      name: manifest.name,
      team: entry.package,
      version: manifest.version,
      permissions: {
        minimum: permission.minimum,
        maximum: permission.maximum,
        enforcement: permission.enforcement,
      },
      capabilities,
      tools,
      workflows,
      source: {
        repository: "kujolang/kujo-agents",
        path: entry.path,
        manifestHash: digest(rawManifest),
        agentHash: digest(agent),
        skillHash: digest(skill),
      },
      contracts: { agent, skill, manifest },
    });
  }
  return {
    schema: "agent-city.agent-catalog.v1",
    importedAt: new Date().toISOString(),
    source: { repository: "kujolang/kujo-agents", registryHash: digest(raw) },
    profiles,
  };
}
export async function saveCatalog(file: string, catalog: AgentCatalog) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const body = JSON.stringify(catalog);
  if (Buffer.byteLength(body) > 32 * 1024 * 1024)
    throw Error("Imported catalog exceeds limit");
  try {
    await writeFile(temporary, body, { mode: 0o600, flag: "wx" });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}
export async function catalogSummary(file: string) {
  let catalog: AgentCatalog;
  try {
    if ((await stat(file)).size > 32 * 1024 * 1024)
      throw Error("Saved catalog exceeds limit");
    catalog = JSON.parse(await readFile(file, "utf8"));
  } catch (error: any) {
    if (error.code === "ENOENT") return { imported: false, profiles: [] };
    throw error;
  }
  if (
    catalog.schema !== "agent-city.agent-catalog.v1" ||
    !Array.isArray(catalog.profiles)
  )
    throw Error("Invalid saved catalog");
  return {
    imported: true,
    importedAt: catalog.importedAt,
    source: catalog.source,
    profiles: catalog.profiles.map((profile) => ({
      id: profile.id,
      sourceId: profile.sourceId,
      name: profile.name,
      team: profile.team,
      version: profile.version,
      permissions: profile.permissions,
      capabilities: profile.capabilities,
      tools: profile.tools,
      workflows: profile.workflows,
      source: profile.source,
      executionStatus: "NOT_CONNECTED",
      unavailableRequiredCapabilities: profile.capabilities.required,
      reason:
        "Profile imported. Mission execution binding is not connected; importing does not grant tools, permissions or workflow execution.",
    })),
  };
}
