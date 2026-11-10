import { notifyAddress } from "./notify";
import type { OrderRequest } from "./order-request";

export async function sendOrderEmail(order: OrderRequest, requestId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Email sending is not configured");
  const lines = [
    `Reference: ${requestId}`,
    `Name: ${order.name}`,
    order.organization ? `School / organisation: ${order.organization}` : "",
    `Email: ${order.email}`,
    `Phone: ${order.phone}`,
    "",
    "Items requested:",
    ...order.items.map((item) => `- ${item.quantity} x ${item.name}`),
    order.otherItems ? `Other books or stationery: ${order.otherItems}` : "",
    "",
    order.fulfilment === "delivery" ? `Delivery to: ${order.deliveryLocation}` : "Will collect from the shop",
    order.preferredDate ? `Preferred date: ${order.preferredDate}` : "",
    order.notes ? `Notes: ${order.notes}` : "",
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `order-request/${requestId}` },
    body: JSON.stringify({
      from, to: [notifyAddress()], reply_to: order.email,
      subject: "New order request - Oria Exam Supplies",
      text: lines.join("\n"),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Email service returned HTTP ${response.status}`);
  const result: { id?: string } = await response.json();
  if (!result.id) throw new Error("Email service did not return a message ID");
  return result.id;
}
