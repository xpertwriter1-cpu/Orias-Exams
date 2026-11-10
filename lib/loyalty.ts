import type { Db, Document } from "mongodb";
import { normaliseMpesaPhone } from "./mpesa";
import { COLLECTIONS, type RequestKind } from "./request-decisions";

/** 1 point for every shilling spent; a phone at 850 points. */
export const POINTS_PER_KES = 1;
export const POINTS_TARGET = 850;

export function loyaltyPhone(input: unknown): string | null {
  return normaliseMpesaPhone(input);
}

export function pointsFor(amountKes: number): number {
  return Number.isFinite(amountKes) && amountKes > 0 ? Math.floor(amountKes * POINTS_PER_KES) : 0;
}

/** Shows 2547XXXXXXXX as 07XX XXX XXX. */
export function displayPhone(phone: string): string {
  const local = `0${phone.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

let indexReady: Promise<unknown> | null = null;
function ensureIndex(db: Db) {
  indexReady ??= db.collection("loyalty").createIndex({ phone: 1 }, { unique: true }).catch((e) => { indexReady = null; throw e; });
  return indexReady;
}

export async function addPoints(db: Db, rawPhone: unknown, points: number, reason: string, by: string, name = ""): Promise<Document | null> {
  const phone = loyaltyPhone(rawPhone);
  const amount = Math.floor(points);
  if (!phone || !(amount > 0)) return null;
  await ensureIndex(db);
  const now = new Date();
  return db.collection("loyalty").findOneAndUpdate(
    { phone },
    {
      $inc: { points: amount, totalEarned: amount },
      $setOnInsert: { phone, createdAt: now, rewardsGiven: 0 },
      $set: { updatedAt: now, ...(name ? { name: name.slice(0, 120) } : {}) },
      $push: { history: { $each: [{ at: now, points: amount, reason: reason.slice(0, 120), by }], $slice: -100 } } as Document,
    },
    { upsert: true, returnDocument: "after" },
  );
}

/**
 * Gives a paid request its points, once. The request is marked first, so a payment
 * confirmed twice (by Safaricom and by a status check) never earns double.
 */
export async function awardForRequest(db: Db, kind: RequestKind, doc: Document, amountKes: number): Promise<number> {
  const points = pointsFor(amountKes);
  const phone = loyaltyPhone(doc.payment?.phone ?? doc.phone);
  if (!points || !phone) return 0;
  const claimed = await db.collection(COLLECTIONS[kind]).updateOne(
    { _id: doc._id, loyaltyAwarded: { $ne: true } },
    { $set: { loyaltyAwarded: true, loyaltyPoints: points } },
  );
  if (claimed.modifiedCount !== 1) return 0;
  const name = String((kind === "order" ? doc.name : doc.contactName) ?? "");
  await addPoints(db, phone, points, `${kind === "order" ? "Order" : "Printing"} ${doc._id.toString().slice(-6).toUpperCase()}`, "website", name);
  return points;
}

/** Uses 850 points for a phone. Points above the target carry over. */
export async function giveReward(db: Db, rawPhone: unknown, by: string): Promise<boolean> {
  const phone = loyaltyPhone(rawPhone);
  if (!phone) return false;
  const now = new Date();
  const result = await db.collection("loyalty").updateOne(
    { phone, points: { $gte: POINTS_TARGET } },
    {
      $inc: { points: -POINTS_TARGET, rewardsGiven: 1 },
      $set: { updatedAt: now },
      $push: { history: { $each: [{ at: now, points: -POINTS_TARGET, reason: "Phone given", by }], $slice: -100 } } as Document,
    },
  );
  return result.modifiedCount === 1;
}

export async function getLoyalty(db: Db, rawPhone: unknown): Promise<Document | null> {
  const phone = loyaltyPhone(rawPhone);
  return phone ? db.collection("loyalty").findOne({ phone }) : null;
}
