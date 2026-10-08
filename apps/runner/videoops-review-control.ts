import { finalizeVideoops } from "./videoops-finalize";
import type { IncomingMessage, ServerResponse } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { inspectVideoopsNative } from "./videoops-native";
import { recordVideoopsHumanReview } from "./videoops-review-decision";

/** Mission IDs are resolved against runner-owned history, never browser paths. */
export async function handleVideoopsReview(
  req: IncomingMessage,
  res: ServerResponse,
  options: {
    missionsRoot: string;
    agentsRepository: string;
    origin: string;
    token: string;
    knownMission: (id: string) => boolean;
    writable: boolean;
  },
) {
  const match =
    /^\/control\/videoops\/(review|video|finalize|final)\/([a-zA-Z0-9-]{1,100})$/.exec(
      req.url || "",
    );
  if (!match) return false;
  const send = (code: number, data: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (!options.knownMission(match[2])) {
    send(404, { error: "Mission not found" });
    return true;
  }
  if (
    (req.method !== "GET" || match[1] === "finalize") &&
    !(req.method === "POST" && ["review", "finalize"].includes(match[1]))
  ) {
    send(405, { error: "Unsupported method" });
    return true;
  }
  if (
    req.method === "POST" &&
    (req.headers.origin !== options.origin ||
      req.headers["x-city-command-token"] !== options.token ||
      !req.headers["content-type"]?.startsWith("application/json"))
  ) {
    send(403, { error: "Explicit local command token required" });
    return true;
  }
  if (req.method === "POST" && !options.writable) {
    send(503, { error: "Mission storage unavailable" });
    return true;
  }
  try {
    const root = await realpath(options.missionsRoot);
    const workspace = resolve(root, match[2], ".city-production/review-1");
    if ((await realpath(workspace)) !== workspace)
      throw Error("Review workspace redirected");
    const inspection = await inspectVideoopsNative({
      agentsRepository: options.agentsRepository,
      workspace,
      operation: "review.status",
    });
    if (inspection.status !== "observed")
      throw Error("Review evidence unavailable");
    const status = inspection.native;
    if (
      status.candidate?.path !== "output/draft.mp4" ||
      !/^[a-f0-9]{64}$/.test(status.candidate.sha256)
    )
      throw Error("Invalid candidate evidence");
    if (req.method === "POST") {
      let body = "";
      for await (const bytes of req) {
        body += bytes;
        if (Buffer.byteLength(body) > 24576) {
          send(413, { error: "Review request too large" });
          return true;
        }
      }
      if (match[1] === "finalize") {
        const result = await finalizeVideoops({
          agentsRepository: options.agentsRepository,
          missionDirectory: resolve(root, match[2]),
          id: match[2],
          decision: JSON.parse(body),
        });
        send(200, {
          id: match[2],
          status: result.status,
          final: result.final,
          downloadUrl: "/control/videoops/final/" + match[2],
          publication: "NOT_PERFORMED",
        });
        return true;
      }
      const result = await recordVideoopsHumanReview({
        agentsRepository: options.agentsRepository,
        workspace,
        decision: JSON.parse(body),
      });
      send(200, result);
      return true;
    }
    if (match[1] === "review") {
      send(200, {
        id: match[2],
        status,
        videoUrl: "/control/videoops/video/" + match[2],
        finalUrl:
          status.state === "APPROVED" &&
          status.candidate?.promotion?.sha256 === status.candidate.sha256
            ? "/control/videoops/final/" + match[2]
            : null,
      });
      return true;
    }
    const final = match[1] === "final";
    if (
      final &&
      (status.state !== "APPROVED" ||
        status.candidate?.promotion?.path !== "output/final.mp4" ||
        status.candidate.promotion.sha256 !== status.candidate.sha256)
    )
      throw Error("Approved final artifact unavailable");
    const file = resolve(
      workspace,
      final ? "output/final.mp4" : "output/draft.mp4",
    );
    const info = await lstat(file);
    if (
      !info.isFile() ||
      info.size > 33554432 ||
      (await realpath(file)) !== file
    )
      throw Error("Invalid candidate file");
    const bytes = await readFile(file);
    if (
      bytes.length !== info.size ||
      createHash("sha256").update(bytes).digest("hex") !==
        status.candidate.sha256
    )
      throw Error("Candidate changed");
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": bytes.length,
      "Content-Disposition": final
        ? "attachment; filename=final.mp4"
        : "inline; filename=draft.mp4",
    });
    res.end(bytes);
  } catch (error) {
    send(req.method === "POST" ? 400 : 404, {
      error: error instanceof Error ? error.message : "Review unavailable",
    });
  }
  return true;
}
