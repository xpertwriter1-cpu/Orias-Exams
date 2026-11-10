import { notifyAddress } from "./notify";

/** Emails a customer about their request. Replies go to the shop's admin inbox. */
export async function sendCustomerEmail(to: string, subject: string, text: string, idempotencyKey: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email sending is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from, to: [to], reply_to: notifyAddress(), subject, text }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.json().then((body: { message?: string }) => body.message ?? "").catch(() => "");
    throw new Error(`Email service returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}
