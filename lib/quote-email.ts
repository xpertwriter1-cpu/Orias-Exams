export type PrintingQuote = Record<"organization" | "contactName" | "email" | "phone" | "service" | "details", string>;

export async function sendQuoteEmail(quote: PrintingQuote, requestId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email sending is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `printing-quote/${requestId}` },
    body: JSON.stringify({
      from, to: ["admin@oriaexamsupplies.co.ke"], reply_to: quote.email,
      subject: "New printing quote request - Oria Exam Supplies",
      text: [`Reference: ${requestId}`, `School / organisation: ${quote.organization}`, `Contact person: ${quote.contactName}`, `Email: ${quote.email}`, `Phone: ${quote.phone}`, `Service required: ${quote.service}`, "", "Quantity / details:", quote.details].join("\n"),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Email service returned HTTP ${response.status}`);
  const result: { id?: string } = await response.json();
  if (!result.id) throw new Error("Email service did not return a message ID");
  return result.id;
}
