import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Db, Filter, Document } from "mongodb";

export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_15_MIN = 3;

/** A code made for one purpose never works for another. */
export type CodePurpose = "password-reset" | "admin-login";
export type SendCode = (to: string, code: string, requestId: string) => Promise<void>;

let indexesReady: Promise<unknown> | null = null;
function ensureIndexes(db: Db) {
  // Old code records are removed automatically after a day.
  indexesReady ??= db.collection("emailCodes").createIndexes([
    { key: { email: 1, purpose: 1, createdAt: -1 } },
    { key: { createdAt: 1 }, expireAfterSeconds: 86_400 },
  ]).catch((error) => { indexesReady = null; throw error; });
  return indexesReady;
}

export function normaliseEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Emails a 6-digit code if a matching account exists. It behaves the same
 * either way, so the form never reveals which email addresses have accounts.
 */
export async function requestEmailCode(
  db: Db,
  purpose: CodePurpose,
  rawEmail: unknown,
  send: SendCode,
  accountFilter: Filter<Document> = {},
): Promise<void> {
  const email = normaliseEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  await ensureIndexes(db);
  const codes = db.collection("emailCodes");
  const since = new Date(Date.now() - 15 * 60_000);
  if ((await codes.countDocuments({ email, purpose, createdAt: { $gt: since } })) >= MAX_CODES_PER_15_MIN) return;
  if (!(await db.collection("users").findOne({ ...accountFilter, email }, { projection: { _id: 1 } }))) return;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await codes.updateMany({ email, purpose, usedAt: null }, { $set: { usedAt: now, replaced: true } });
  const { insertedId } = await codes.insertOne({
    email,
    purpose,
    codeHash: await bcrypt.hash(code, 10),
    attempts: 0,
    usedAt: null,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_MINUTES * 60_000),
  });
  try {
    await send(email, code, insertedId.toString());
    await codes.updateOne({ _id: insertedId }, { $set: { sentAt: new Date() } });
  } catch (error) {
    // Kept with the request (deleted after a day) so a failed email can be diagnosed.
    const reason = error instanceof Error ? error.message : "Unknown error";
    await codes.updateOne({ _id: insertedId }, { $set: { sendError: reason.slice(0, 300) } }).catch(() => undefined);
    throw error;
  }
}

/** True only for the latest unused, unexpired code, within the allowed number of tries. A code works once. */
export async function consumeEmailCode(db: Db, purpose: CodePurpose, rawEmail: unknown, rawCode: unknown): Promise<boolean> {
  const email = normaliseEmail(rawEmail);
  const code = String(rawCode ?? "").replace(/\s/g, "");
  if (!email || !/^\d{6}$/.test(code)) return false;

  const codes = db.collection("emailCodes");
  // Counting the attempt before checking stops guessing beyond the limit.
  const record = await codes.findOneAndUpdate(
    { email, purpose, usedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { sort: { createdAt: -1 }, returnDocument: "after" },
  );
  if (!record || !(await bcrypt.compare(code, String(record.codeHash)))) return false;
  const claimed = await codes.updateOne({ _id: record._id, usedAt: null }, { $set: { usedAt: new Date() } });
  return claimed.modifiedCount === 1;
}

export type ResetResult = "ok" | "invalid" | "weak";

export async function resetPasswordWithCode(db: Db, rawEmail: unknown, rawCode: unknown, newPassword: string): Promise<ResetResult> {
  if (newPassword.length < 8) return "weak";
  if (!(await consumeEmailCode(db, "password-reset", rawEmail, rawCode))) return "invalid";
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await db.collection("users").updateOne(
    { email: normaliseEmail(rawEmail) },
    { $set: { passwordHash, passwordChangedAt: new Date() } },
  );
  return updated.matchedCount === 1 ? "ok" : "invalid";
}
