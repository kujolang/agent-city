import {
  copyVideoopsMedia,
  inspectVideoopsMedia,
} from "./videoops-media-transfer";
import type { VerifiedVideoopsAsset } from "./videoops-gates";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  readVideoopsAttempt,
  type saveVideoopsAttempt,
} from "./videoops-artifacts";
import { validateVideoopsRenderInput } from "./videoops-render-input";
import { boundedCommand } from "./bounded-command";
import { verifyWorkcellEvidence } from "./workcell-evidence";

/** Execute verified Editor bytes in a fresh, explicitly authorized offline Workcell.
 * This produces a review candidate, never publication or perceptual approval. */
export async function renderVideoopsAttempt(
  options: {
    root: string;
    mediaRoot?: string;
    media?: VerifiedVideoopsAsset[];
    runtime: string;
    image: string;
    producer: string;
    run: string;
    task: string;
    spool: string;
    editor: Awaited<ReturnType<typeof saveVideoopsAttempt>>;
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
  },
  execute = boundedCommand,
) {
  if (!/^sha256:[a-f0-9]{64}$/.test(options.image))
    throw Error("Immutable render image required");
  for (const id of [options.producer, options.run, options.task])
    if (!/^[a-zA-Z0-9_.:-]{1,200}$/.test(id))
      throw Error("Invalid render source identity");
  if (options.editor.receipt.stage !== "hyperframes-editor")
    throw Error("Stored Editor attempt required");
  const composition = await readVideoopsAttempt(options.editor);
  if (options.media?.length && !options.mediaRoot)
    throw Error("Explicit acquired media root required");
  const media = options.media?.length
    ? await inspectVideoopsMedia(options.mediaRoot || "", options.media)
    : [];
  const input = {
    schema: "agent-city.videoops-render-input.v1",
    composition,
    ...(media.length ? { media } : {}),
    width: options.width,
    height: options.height,
    fps: options.fps,
    durationSeconds: options.durationSeconds,
  };
  const { composition: _, ...expected } = validateVideoopsRenderInput(input);
  const runtime = resolve(options.runtime);
  // No reuse after success, failure or uncertain execution; preserves lineage.
  await mkdir(runtime, { mode: 0o700 });
  if (media.length) {
    const mediaRoot = resolve(runtime, "media");
    await mkdir(mediaRoot, { mode: 0o700 });
    await copyVideoopsMedia(options.mediaRoot!, mediaRoot, media);
  }
  const inputFile = resolve(runtime, "input.json");
  await writeFile(inputFile, JSON.stringify(input), {
    mode: 0o600,
    flag: "wx",
  });
  const lineage = {
    editor: options.editor.receipt,
    image: options.image,
    producer: options.producer,
    run: options.run,
    task: options.task,
  };
  await writeFile(resolve(runtime, "lineage.json"), JSON.stringify(lineage), {
    mode: 0o600,
    flag: "wx",
  });
  try {
    const result = await execute(
      process.execPath,
      ["--import", "tsx", "integrations/kujo/workcell.ts"],
      {
        cwd: options.root,
        env: {
          ...process.env,
          CITY_RUNTIME_DIR: runtime,
          CITY_WORKCELL_IMAGE: options.image,
          CITY_WORKCELL_VIDEOOPS_FILE: inputFile,
          CITY_RUN: options.run,
          CITY_PRODUCER: options.producer,
          CITY_TASK: options.task,
          CITY_SPOOL: options.spool,
          CITY_WORKCELL_KUJO_FILE: "",
          CITY_WORKCELL_PROJECT_FILE: "",
          CITY_PROJECT_EXPORTS_FILE: "",
          CITY_WORKCELL_CANCEL_FILE: "",
        },
        timeoutMs: 360000,
      },
    );
    await writeFile(
      resolve(runtime, "private-process.json"),
      JSON.stringify(result),
      { mode: 0o600, flag: "wx" },
    );
    if (result.timedOut)
      throw Error(
        "Render timed out; Workcell outcome and cleanup require reconciliation, no automatic retry",
      );
    if (result.code !== 0)
      throw Error("Workcell render failed; private process evidence retained");
    const proof = JSON.parse(
      await readFile(resolve(runtime, "workcell-proof.json"), "utf8"),
    );
    const source = resolve(runtime, "workcell-source");
    const evidence = await verifyWorkcellEvidence(
      source,
      proof.summary,
      ["output/draft.mp4", "output/metadata.json", "output/check.json"],
      {
        "output/draft.mp4": 33554432,
        "output/metadata.json": 1048576,
        "output/check.json": 2097152,
      },
    );
    const directory = resolve(
      source,
      ".workcell/runs",
      evidence.runId,
      "artifacts",
    );
    const metadata = JSON.parse(
      await readFile(resolve(directory, "output/metadata.json"), "utf8"),
    );
    const candidate = evidence.artifacts.find(
      (a) => a.name === "output/draft.mp4",
    )!;
    if (
      metadata.schema !== "agent-city.videoops-render-receipt.v1" ||
      metadata.status !== "passed" ||
      metadata.technical !== "passed" ||
      metadata.perceptual !== "NOT_REVIEWED" ||
      metadata.publication !== "NOT_PERFORMED" ||
      Object.entries(expected).some(
        ([key, value]) =>
          JSON.stringify(metadata.request?.[key]) !== JSON.stringify(value),
      ) ||
      metadata.artifact?.path !== candidate.name ||
      metadata.artifact?.sha256 !== candidate.sha256 ||
      metadata.artifact?.bytes !== candidate.bytes
    )
      throw Error("Render metadata does not match the requested candidate");
    const receipt = {
      schema: "agent-city.videoops-candidate.v1",
      status: "ready-for-review",
      ...lineage,
      workcell: evidence,
      candidate,
      directory,
      metadata,
      productionApproval: "NOT_ESTABLISHED",
    };
    await writeFile(
      resolve(runtime, "candidate.json"),
      JSON.stringify(receipt, null, 2),
      { mode: 0o600, flag: "wx" },
    );
    return receipt;
  } catch (error) {
    await writeFile(
      resolve(runtime, "failed.json"),
      JSON.stringify({
        status: "failed",
        reason: error instanceof Error ? error.message : "Render failed",
        productionApproval: "NOT_ESTABLISHED",
      }),
      { mode: 0o600, flag: "wx" },
    );
    throw error;
  }
}
