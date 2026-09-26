import { readFile, stat, writeFile, link, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
export async function readCheckpoint(dir: string, now = Date.now()) {
  try {
    const file = resolve(dir, "checkpoint.json");
    if ((await stat(file)).size > 20_000) return null;
    const value = JSON.parse(await readFile(file, "utf8"));
    if (
      !/^(writer|coder|reviewer)-[1-3]$/.test(value.id) ||
      typeof value.question !== "string" ||
      value.question.length > 8192 ||
      !Number.isFinite(value.deadline) ||
      value.deadline <= now
    )
      return null;
    try {
      await stat(resolve(dir, `answer-${value.id}.json`));
      return null;
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
    return value as {
      id: string;
      question: string;
      deadline: number;
      agent: string;
      run: string;
      producer: string;
    };
  } catch {
    return null;
  }
}
/** Caller must first authenticate Origin/token and resolve a running job. Atomic, one answer per checkpoint. */
export async function answerCheckpoint(
  dir: string,
  id: unknown,
  answer: unknown,
) {
  if (
    typeof answer !== "string" ||
    !answer.trim() ||
    Buffer.byteLength(answer) > 8192
  )
    throw Error("Reply must be 1–8192 bytes");
  const checkpoint = await readCheckpoint(dir);
  if (!checkpoint || checkpoint.id !== id)
    throw Error("This check-in is no longer waiting");
  const temporary = resolve(dir, `answer-${randomUUID()}.tmp`);
  await writeFile(
    temporary,
    JSON.stringify({ checkpointId: id, answer, answeredAt: Date.now() }),
    { mode: 0o600, flag: "wx" },
  );
  try {
    await link(temporary, resolve(dir, `answer-${checkpoint.id}.json`));
  } finally {
    await unlink(temporary);
  }
}
