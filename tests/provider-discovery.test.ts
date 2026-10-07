import { expect, test, vi } from "vitest";
import {
  discoverOllama,
  checkModelConnection,
} from "../apps/runner/provider-discovery";
const config = {
  endpoint: "https://provider.example/v1/chat/completions",
  model: "writer",
  apiKey: "test-private-key",
};
test("local discovery uses only fixed loopback metadata and does not select or execute a model", async () => {
  const request = vi.fn(async () =>
    Response.json({
      models: [
        { name: "writer" },
        { name: "writer" },
        { name: "<script>" },
        { name: "bad\nname" },
      ],
    }),
  );
  const result = await discoverOllama(request as typeof fetch);
  expect(result.models).toEqual(["<script>", "writer"]);
  expect(result.requiresKey).toBe(false);
  expect(request).toHaveBeenCalledOnce();
  const [url, options] = request.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("http://127.0.0.1:11434/api/tags");
  expect(options.redirect).toBe("error");
  expect(options.body).toBeUndefined();
  expect(options.headers).toEqual({});
});
test("connection check sends credentials only to the configured provider and reports listing, not generation", async () => {
  const request = vi.fn(async () =>
    Response.json({ data: [{ id: "writer" }] }),
  );
  const result = await checkModelConnection(config, request as typeof fetch);
  const [url, options] = request.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe("https://provider.example/v1/models");
  expect(options.headers).toEqual({ Authorization: "Bearer test-private-key" });
  expect(options.redirect).toBe("error");
  expect(options.body).toBeUndefined();
  expect(result.modelListed).toBe(true);
  expect(result.message).toContain("No prompt was sent");
  expect(JSON.stringify(result)).not.toContain(config.apiKey);
});
test("missing model does not fabricate availability and malformed/oversized lists are rejected", async () => {
  expect(
    (
      await checkModelConnection(config, async () =>
        Response.json({ data: [] }),
      )
    ).modelListed,
  ).toBe(false);
  await expect(
    checkModelConnection(config, async () => new Response("x".repeat(262145))),
  ).rejects.toThrow("limit");
  await expect(
    checkModelConnection(config, async () => Response.json({ models: [] })),
  ).rejects.toThrow("invalid model list");
  await expect(
    checkModelConnection(
      config,
      async () => new Response("private diagnostic", { status: 401 }),
    ),
  ).rejects.toThrow("HTTP 401");
  const unavailable = await discoverOllama(async () => {
    throw Error("private diagnostic");
  });
  expect(unavailable.available).toBe(false);
  expect(JSON.stringify(unavailable)).not.toContain("private diagnostic");
});
