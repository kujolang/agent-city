import type { ModelConfig } from "./config";

async function metadata(
  url: string,
  headers: Record<string, string>,
  request: typeof fetch,
) {
  const response = await request(url, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error(`Provider returned HTTP ${response.status}`);
  let body = "";
  if (!response.body) throw Error("Provider returned no model metadata");
  const reader = response.body.getReader();
  try {
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 256 * 1024)
        throw Error("Provider model metadata exceeds limit");
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } finally {
    await reader.cancel().catch(() => {});
  }
}
function names(values: unknown[]): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0 &&
          value.length <= 200 &&
          !/[\r\n]/.test(value),
      ),
    ),
  ]
    .sort()
    .slice(0, 200);
}
export async function discoverOllama(request: typeof fetch = fetch) {
  try {
    const body = await metadata("http://127.0.0.1:11434/api/tags", {}, request);
    if (!Array.isArray(body.models)) throw Error("Invalid Ollama model list");
    return {
      available: true,
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      models: names(body.models.map((item: any) => item?.name)),
      requiresKey: false,
    };
  } catch {
    return {
      available: false,
      models: [],
      message:
        "Local Ollama was not reachable or returned invalid metadata. Start Ollama, then detect again. No provider was selected.",
    };
  }
}
export async function checkModelConnection(
  config: ModelConfig,
  request: typeof fetch = fetch,
) {
  const url = new URL(config.endpoint);
  if (!url.pathname.endsWith("/chat/completions"))
    throw Error(
      "Model listing requires an endpoint ending in /chat/completions",
    );
  url.pathname = url.pathname.replace(/\/chat\/completions$/, "/models");
  const body = await metadata(
    url.href,
    config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    request,
  );
  if (!Array.isArray(body.data))
    throw Error("Provider returned an invalid model list");
  const models = names(body.data.map((item: any) => item?.id));
  return {
    reachable: true,
    modelListed: models.includes(config.model),
    message: models.includes(config.model)
      ? "Provider model list is reachable and this model is listed. No prompt was sent; generation and task quality still require a real mission."
      : "Provider model list is reachable, but this model was not listed. Verify the exact model ID. Some providers omit supported models.",
  };
}
