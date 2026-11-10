import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { sendOrderEmail } from "@/lib/order-email";
import { parseOrderForm } from "@/lib/order-request";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const redirect = (query: string) => NextResponse.redirect(new URL(`/order?${query}`, req.url), 303);
  const form = await req.formData();
  // Hidden field that only automated spam fills in.
  if (String(form.get("website") ?? "")) return redirect("success=1");
  const parsed = parseOrderForm(form);
  if ("error" in parsed) return redirect(`error=${parsed.error}`);
  try {
    const session = await getSession();
    const orders = (await getMongoClient()).db(dbName).collection("orderRequests");
    const result = await orders.insertOne({ ...parsed.order, userId: session?.id || null, status: "new", emailStatus: "pending", createdAt: new Date() });
    try {
      const emailId = await sendOrderEmail(parsed.order, result.insertedId.toString());
      await orders.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "sent", emailId, emailSentAt: new Date() } }).catch(() => undefined);
    } catch (error) {
      console.error("Order email notification failed:", error instanceof Error ? error.message : "Unknown error");
      await orders.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "failed" } }).catch(() => undefined);
    }
    return redirect("success=1");
  } catch (error) {
    console.error("Order request failed:", error instanceof Error ? error.name : "Unknown error");
    return redirect("error=unavailable");
  }
}
