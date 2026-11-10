import { randomBytes } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { PAYBILL, PHONES, paymentReference } from "./business";
import { formatDate, parseFutureDate } from "./dates";

export type RequestKind = "order" | "printing";
export type Decision = "approved" | "rejected" | "reschedule";

export const COLLECTIONS: Record<RequestKind, string> = { order: "orderRequests", printing: "printingRequests" };

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  approved: "Approved",
  rejected: "Rejected",
  reschedule: "New date suggested",
};

const WHAT: Record<RequestKind, { label: string; path: string }> = {
  order: { label: "order request", path: "/order" },
  printing: { label: "printing quote request", path: "/request-printing" },
};

export function isRequestKind(value: string): value is RequestKind {
  return value === "order" || value === "printing";
}

export type DecisionInput = { decision: Decision; note: string; proposedDate: string | null; amountDue?: number | null };

/** Reads the admin's decision form. A new date is required, and must not be in the past, when suggesting one. */
export function parseDecision(form: FormData, now = new Date()): DecisionInput | { error: "decision" | "date" | "amount" } {
  const decision = String(form.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected" && decision !== "reschedule") return { error: "decision" };
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);
  if (decision === "approved") {
    // Optional: the amount the customer pays by M-Pesa, in whole shillings (M-Pesa allows up to 250,000).
    const raw = String(form.get("amountDue") ?? "").replace(/[,\s]/g, "");
    if (!raw) return { decision, note, proposedDate: null, amountDue: null };
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount < 1 || amount > 250_000) return { error: "amount" };
    return { decision, note, proposedDate: null, amountDue: amount };
  }
  if (decision !== "reschedule") return { decision, note, proposedDate: null };
  const proposedDate = parseFutureDate(form.get("proposedDate"), now);
  return proposedDate ? { decision, note, proposedDate } : { error: "date" };
}

/** Saves the decision and keeps a history of every change. Returns the updated request, or null if it doesn't exist. */
export async function applyDecision(db: Db, kind: RequestKind, id: string, input: DecisionInput, adminEmail: string): Promise<Document | null> {
  if (!ObjectId.isValid(id)) return null;
  const decidedAt = new Date();
  const collection = db.collection(COLLECTIONS[kind]);
  // Older requests may not have a private link yet; give them one so the customer can see the decision and pay.
  await collection.updateOne({ _id: new ObjectId(id), accessToken: { $exists: false } }, { $set: { accessToken: randomBytes(16).toString("hex") } });
  const amountDue = input.decision === "approved" ? input.amountDue ?? null : null;
  return collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: { status: input.decision, decisionNote: input.note, proposedDate: input.proposedDate, amountDue, decidedAt, decidedBy: adminEmail },
      $push: { history: { status: input.decision, note: input.note, proposedDate: input.proposedDate, at: decidedAt, by: adminEmail } } as Document,
    },
    { returnDocument: "after" },
  );
}

/** The message the customer should get about the decision. */
export function customerMessage(kind: RequestKind, request: Document, siteUrl: string): { subject: string; text: string } | null {
  const status = String(request.status ?? "");
  if (status !== "approved" && status !== "rejected" && status !== "reschedule") return null;
  const name = String((kind === "order" ? request.name : request.contactName) ?? "").trim() || "there";
  const what = WHAT[kind];
  const note = String(request.decisionNote ?? "").trim();
  const noteLine = note ? `\n\n${note}` : "";
  const preferred = typeof request.preferredDate === "string" && request.preferredDate ? formatDate(request.preferredDate) : "";
  const newRequestLink = `${siteUrl}${what.path}`;
  let subject: string;
  let body: string;
  const link = request._id && request.accessToken ? `${siteUrl}/pay/${kind}/${request._id.toString()}?t=${request.accessToken}` : "";
  const amount = Number(request.amountDue);
  if (status === "approved") {
    subject = `Your ${what.label} is approved`;
    const payLine = amount > 0 && link
      ? `\n\nThe total is KES ${amount.toLocaleString("en-KE")}. Pay by M-Pesa here: ${link}\nOr use M-Pesa Paybill ${PAYBILL}, account number ${paymentReference(request._id.toString())}. You can also pay by cash or cheque at the shop.`
      : `\n\nWe'll be in touch about collection and payment.${link ? ` You can check your request here: ${link}` : ""}`;
    body = `Good news: your ${what.label} has been approved${preferred ? ` for ${preferred}` : ""}.${noteLine}${payLine}\n\nReply to this message if you have any questions.`;
  } else if (status === "rejected") {
    subject = `About your ${what.label}`;
    body = `Thank you for your ${what.label}. Unfortunately we can't take it on this time.${noteLine}\n\nYou're welcome to send a new request at ${newRequestLink}`;
  } else {
    const proposed = typeof request.proposedDate === "string" && request.proposedDate ? formatDate(request.proposedDate) : "another day";
    subject = `Please choose another date for your ${what.label}`;
    body = `Thank you for your ${what.label}. We can't do it on ${preferred || "the date you asked for"}, so please book another date. We can offer ${proposed}.${noteLine}\n\nReply to confirm the new date, or send a new request at ${newRequestLink}`;
  }
  return { subject: `${subject} - Oria Exam Supplies`, text: `Hello ${name},\n\n${body}\n\nOria Exam Supplies\n${PHONES.map((p) => p.display).join(" / ")}` };
}

/** Turns a Kenyan or international number into a WhatsApp link, or null if it doesn't look like a phone number. */
export function whatsappLink(phone: unknown, text: string): string | null {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) digits = `254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) digits = `254${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: unknown, subject: string, text: string): string | null {
  const address = String(email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
