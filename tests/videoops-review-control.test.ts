import { test, expect } from "vitest";
import { handleVideoopsReview } from "../apps/runner/videoops-review-control";
test("review control rejects unknown missions, cross-origin writes and unavailable storage before filesystem access", async () => {
  const options = {
    missionsRoot: "/nonexistent",
    agentsRepository: "/nonexistent",
    origin: "http://127.0.0.1:5178",
    token: "private",
    knownMission: (id: string) => id === "mission-known",
    writable: true,
  };
  let code = 0;
  const res: any = {
    writeHead: (c: number) => {
      code = c;
    },
    end: () => {},
  };
  const req: any = {
    method: "POST",
    url: "/control/videoops/review/mission-unknown",
    headers: {},
  };
  expect(await handleVideoopsReview(req, res, options)).toBe(true);
  expect(code).toBe(404);
  req.url = "/control/videoops/review/mission-known";
  await handleVideoopsReview(req, res, options);
  expect(code).toBe(403);
  req.headers = {
    origin: options.origin,
    "x-city-command-token": "private",
    "content-type": "application/json",
  };
  await handleVideoopsReview(req, res, { ...options, writable: false });
  expect(code).toBe(503);
  req.url = "/control/videoops/review/../../outside";
  expect(await handleVideoopsReview(req, res, options)).toBe(false);
});
