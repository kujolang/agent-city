import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
export async function providerDiagnostics(missionsRoot: string, id: string) {
  if (!/^mission-[0-9a-f-]{36}$/.test(id))
    throw Error("Invalid mission identity");
  const path = resolve(missionsRoot, id, "provider-diagnostics.jsonl");
  let text: string;
  try {
    if ((await stat(path)).size > 65536)
      throw Error("Diagnostic limit exceeded");
    text = await readFile(path, "utf8");
  } catch (error: any) {
    if (error.code === "ENOENT")
      return {
        records: [],
        complete: false,
        message: "No provider diagnostics recorded for this attempt.",
      };
    throw error;
  }
  let complete = text.endsWith("\n");
  try {
    await stat(path + ".gap");
    complete = false;
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  const records = [];
  for (const line of text.split("\n").slice(0, -1)) {
    try {
      const row = JSON.parse(line);
      if (
        row.schema !== "agent-city.provider-diagnostic.v1" ||
        !["writer", "coder", "reviewer"].includes(row.agent) ||
        typeof row.run !== "string" ||
        !/^[a-zA-Z0-9:_-]{1,200}$/.test(row.run) ||
        !Number.isSafeInteger(row.httpStatus) ||
        row.httpStatus < 0 ||
        row.httpStatus > 599 ||
        !Number.isSafeInteger(row.contentCharacters) ||
        row.contentCharacters < 0 ||
        row.contentCharacters > 262144 ||
        !Number.isSafeInteger(row.requestedMaxTokens) ||
        row.requestedMaxTokens < 1 ||
        row.requestedMaxTokens > 32768 ||
        !Number.isSafeInteger(row.occurredAtMs)
      )
        throw Error("Invalid diagnostic metadata");
      records.push({
        agent: row.agent,
        run: row.run,
        httpStatus: row.httpStatus,
        finishReason: [
          "stop",
          "length",
          "tool_calls",
          "function_call",
          "content_filter",
        ].includes(row.finishReason)
          ? row.finishReason
          : "unknown",
        contentCharacters: row.contentCharacters,
        reasoningPresent: row.reasoningPresent === true,
        toolRequested:
          typeof row.toolRequested === "boolean" ? row.toolRequested : null,
        requestedMaxTokens: row.requestedMaxTokens,
        occurredAtMs: row.occurredAtMs,
      });
    } catch {
      complete = false;
    }
  }
  return {
    records,
    complete,
    message:
      "Best-effort provider metadata; complete call coverage is not guaranteed. No prompts, final text, reasoning text or credentials are included.",
  };
}
