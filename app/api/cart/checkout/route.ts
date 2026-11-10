import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE, parseCart } from "@/lib/cart";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { sendOrderEmail } from "@/lib/order-email";
import { parseOrderForm } from "@/lib/order-request";
import { newAccessToken } from "@/lib/payments";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const back = (query: string) => NextResponse.redirect(new URL(`/cart?${query}`, req.url), 303);
  const form = await req.formData();
  if (String(form.get("website") ?? "")) return back("error=unavailable");
  const lines = parseCart((await cookies()).get(CART_COOKIE)?.value);
  if (lines.length === 0) return back("error=empty");

  // The basket supplies the items; the form supplies the customer's details.
  for (const line of lines) form.set(`qty-${line.slug}`, String(line.quantity));
  const parsed = parseOrderForm(form);
  if ("error" in parsed) return back(`error=${parsed.error}`);

  try {
    const session = await getSession();
    const orders = (await getMongoClient()).db(dbName).collection("orderRequests");
    const accessToken = newAccessToken();
    const result = await orders.insertOne({ ...parsed.order, source: "basket", accessToken, userId: session?.id || null, status: "new", emailStatus: "pending", createdAt: new Date() });
    try {
      const emailId = await sendOrderEmail(parsed.order, result.insertedId.toString());
      await orders.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "sent", emailId, emailSentAt: new Date() } }).catch(() => undefined);
    } catch (error) {
      console.error("Order email notification failed:", error instanceof Error ? error.message : "Unknown error");
      await orders.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "failed" } }).catch(() => undefined);
    }
    const res = NextResponse.redirect(new URL(`/pay/order/${result.insertedId.toString()}?t=${accessToken}&new=1`, req.url), 303);
    res.cookies.set(CART_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    console.error("Basket checkout failed:", error instanceof Error ? error.name : "Unknown error");
    return back("error=unavailable");
  }
}
