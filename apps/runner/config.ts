export interface ModelConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxOutputTokens?: number;
  requestTimeoutSeconds?: number;
}
export function validateModelConfig(value: unknown): ModelConfig {
  if (!value || typeof value !== "object")
    throw Error("Provide a model configuration");
  const data = value as Record<string, unknown>;
  if (
    typeof data.endpoint !== "string" ||
    typeof data.model !== "string" ||
    typeof data.apiKey !== "string"
  )
    throw Error("Endpoint, model and API key must be text");
  const url = new URL(data.endpoint);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error(
      "Use HTTPS or local HTTP without URL credentials, query or fragment",
    );
  if (
    !data.model.trim() ||
    data.model.length > 200 ||
    /[\r\n]/.test(data.model) ||
    data.apiKey.length > 8192 ||
    /[\r\n]/.test(data.apiKey)
  )
    throw Error("Invalid model name or API key");
  const maxOutputTokens = data.maxOutputTokens ?? 2048;
  if (
    typeof maxOutputTokens !== "number" ||
    !Number.isInteger(maxOutputTokens) ||
    maxOutputTokens < 256 ||
    maxOutputTokens > 16384
  )
    throw Error("Output token limit must be an integer from 256 to 16384");
  const requestTimeoutSeconds = data.requestTimeoutSeconds ?? 90;
  if (
    typeof requestTimeoutSeconds !== "number" ||
    !Number.isInteger(requestTimeoutSeconds) ||
    requestTimeoutSeconds < 10 ||
    requestTimeoutSeconds > 300
  )
    throw Error("Provider timeout must be an integer from 10 to 300 seconds");
  return {
    requestTimeoutSeconds,
    endpoint: url.href,
    model: data.model.trim(),
    apiKey: data.apiKey,
    maxOutputTokens,
  };
}
