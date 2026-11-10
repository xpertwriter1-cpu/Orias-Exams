import { randomBytes } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { mpesaConfig, normaliseMpesaPhone, stkPush, stkQuery, type MpesaConfig, type StkCallback } from "./mpesa";
import { COLLECTIONS, type RequestKind } from "./request-decisions";

export const newAccessToken = () => randomBytes(16).toString("hex");

const PROMPT_WAIT_MS = 60_000;
const MAX_ATTEMPTS_PER_10_MIN = 3;

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export function paymentStatus(doc: Document): PaymentStatus {
  return (doc.payment?.status as PaymentStatus) ?? "unpaid";
}

/** Finds a request using its private link. A wrong or missing token finds nothing. */
export async function findByAccessToken(db: Db, kind: RequestKind, id: string, token: unknown): Promise<Document | null> {
  const value = String(token ?? "");
  if (!ObjectId.isValid(id) || !/^[0-9a-f]{32}$/.test(value)) return null;
  return db.collection(COLLECTIONS[kind]).findOne({ _id: new ObjectId(id), accessToken: value });
}

export function canPay(doc: Document): boolean {
  return doc.status === "approved" && Number(doc.amountDue) > 0 && paymentStatus(doc) !== "paid";
}

export type StartResult = "sent" | "pending" | "phone" | "not-payable" | "not-configured" | "too-many" | "failed";

/** Sends the M-Pesa prompt to the customer's phone. */
export async function startPayment(db: Db, kind: RequestKind, doc: Document, phoneInput: unknown, siteUrl: string, cfg: MpesaConfig | null = mpesaConfig()): Promise<StartResult> {
  if (!canPay(doc)) return "not-payable";
  if (!cfg) return "not-configured";
  const phone = normaliseMpesaPhone(phoneInput);
  if (!phone) return "phone";
  const now = Date.now();
  if (paymentStatus(doc) === "pending" && now - new Date(doc.payment.requestedAt).getTime() < PROMPT_WAIT_MS) return "pending";
  const recent = (doc.paymentAttempts ?? []).filter((a: { at: Date }) => now - new Date(a.at).getTime() < 10 * 60_000);
  if (recent.length >= MAX_ATTEMPTS_PER_10_MIN) return "too-many";

  const callbackToken = randomBytes(16).toString("hex");
  const amount = Math.round(Number(doc.amountDue));
  const result = await stkPush(cfg, {
    phone,
    amount,
    accountReference: `ORIA${doc._id.toString().slice(-6).toUpperCase()}`,
    description: kind === "order" ? "Oria order" : "Oria printing",
    callbackUrl: `${siteUrl}/api/mpesa/callback/${callbackToken}`,
  });
  const at = new Date();
  const collection = db.collection(COLLECTIONS[kind]);
  if (!result.ok) {
    await collection.updateOne({ _id: doc._id }, {
      $set: { "payment.status": "failed", "payment.resultDesc": result.message, "payment.updatedAt": at },
      $push: { paymentAttempts: { at, ok: false, message: result.message } } as Document,
    });
    return "failed";
  }
  await collection.updateOne({ _id: doc._id }, {
    $set: {
      payment: {
        status: "pending", amount, phone, requestedAt: at, updatedAt: at, callbackToken,
        checkoutRequestId: result.checkoutRequestId, merchantRequestId: result.merchantRequestId,
      },
    },
    $push: { paymentAttempts: { at, ok: true, checkoutRequestId: result.checkoutRequestId } } as Document,
  });
  return "sent";
}

async function markPaid(db: Db, kind: RequestKind, doc: Document, receipt: string | null, how: string) {
  await db.collection(COLLECTIONS[kind]).updateOne(
    { _id: doc._id, "payment.status": { $ne: "paid" } },
    { $set: { "payment.status": "paid", "payment.receipt": receipt, "payment.paidAt": new Date(), "payment.updatedAt": new Date(), "payment.confirmedBy": how } },
  );
}

async function markFailed(db: Db, kind: RequestKind, doc: Document, resultCode: string, resultDesc: string) {
  await db.collection(COLLECTIONS[kind]).updateOne(
    { _id: doc._id, "payment.status": "pending", "payment.checkoutRequestId": doc.payment.checkoutRequestId },
    { $set: { "payment.status": "failed", "payment.resultCode": resultCode, "payment.resultDesc": resultDesc, "payment.updatedAt": new Date() } },
  );
}

/**
 * Handles Safaricom's result message. These messages are not signed, so one only counts when it arrives
 * at the secret address made for that prompt, names the same prompt, and has the exact amount asked for.
 */
export async function handleCallback(db: Db, callbackToken: string, cb: StkCallback, cfg: MpesaConfig | null = mpesaConfig()): Promise<"paid" | "failed" | "ignored"> {
  if (!/^[0-9a-f]{32}$/.test(callbackToken)) return "ignored";
  for (const kind of Object.keys(COLLECTIONS) as RequestKind[]) {
    const doc = await db.collection(COLLECTIONS[kind]).findOne({ "payment.callbackToken": callbackToken, "payment.checkoutRequestId": cb.checkoutRequestId });
    if (!doc) continue;
    if (paymentStatus(doc) === "paid") return "paid";
    if (cb.resultCode !== "0") {
      await markFailed(db, kind, doc, cb.resultCode, cb.resultDesc);
      return "failed";
    }
    if (cb.amount === null || Math.round(cb.amount) !== Math.round(Number(doc.payment.amount)) || !cb.receipt) return "ignored";
    // Double-check with Safaricom when possible; a clear "not paid" answer wins over the message.
    if (cfg) {
      const check = await stkQuery(cfg, cb.checkoutRequestId).catch(() => ({ resultCode: null, resultDesc: "" }));
      if (check.resultCode !== null && check.resultCode !== "0") return "ignored";
    }
    await markPaid(db, kind, doc, cb.receipt, "callback");
    return "paid";
  }
  return "ignored";
}

/** If a prompt has been waiting a while, asks Safaricom how it ended (in case the result message was lost). */
export async function refreshPayment(db: Db, kind: RequestKind, doc: Document, cfg: MpesaConfig | null = mpesaConfig()): Promise<PaymentStatus> {
  const status = paymentStatus(doc);
  if (status !== "pending" || !cfg) return status;
  const waited = Date.now() - new Date(doc.payment.requestedAt).getTime();
  const lastCheck = doc.payment.lastCheckedAt ? Date.now() - new Date(doc.payment.lastCheckedAt).getTime() : Infinity;
  if (waited < 25_000 || lastCheck < 10_000) return status;
  await db.collection(COLLECTIONS[kind]).updateOne({ _id: doc._id }, { $set: { "payment.lastCheckedAt": new Date() } });
  const check = await stkQuery(cfg, doc.payment.checkoutRequestId).catch(() => ({ resultCode: null, resultDesc: "" }));
  if (check.resultCode === "0") {
    await markPaid(db, kind, doc, null, "status check");
    return "paid";
  }
  if (check.resultCode !== null) {
    await markFailed(db, kind, doc, check.resultCode, check.resultDesc);
    return "failed";
  }
  return "pending";
}

/** The admin records a payment made another way, such as cash or M-Pesa sent directly. */
export async function markPaidManually(db: Db, kind: RequestKind, id: string, note: string, adminEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await db.collection(COLLECTIONS[kind]).updateOne(
    { _id: new ObjectId(id), "payment.status": { $ne: "paid" } },
    { $set: { "payment.status": "paid", "payment.receipt": note.slice(0, 60) || null, "payment.paidAt": new Date(), "payment.updatedAt": new Date(), "payment.confirmedBy": `admin ${adminEmail}` } },
  );
  return result.modifiedCount === 1;
}
