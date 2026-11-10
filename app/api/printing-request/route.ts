import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { sendQuoteEmail, type PrintingQuote } from "@/lib/quote-email";
import { parseFutureDate } from "@/lib/dates";
import { newAccessToken } from "@/lib/payments";

export async function POST(req: Request) {
  const redirect = (query: string) => NextResponse.redirect(new URL(`/request-printing?${query}`, req.url), 303);
  const form = await req.formData();
  const fields = ["organization", "contactName", "email", "phone", "service", "details"] as const;
  const data = Object.fromEntries(fields.map(key => [key, String(form.get(key) || "").trim()])) as PrintingQuote;
  if (fields.some(key => !data[key]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return redirect("error=required");
  try {
    const session = await getSession();
    const client = await getMongoClient();
    const requests = client.db(dbName).collection("printingRequests");
    const accessToken = newAccessToken();
    const result = await requests.insertOne({ ...data, accessToken, preferredDate: parseFutureDate(form.get("preferredDate")), userId: session?.id || null, status: "new", createdAt: new Date(), emailStatus: "pending" });
    let emailId: string;
    try {
      emailId = await sendQuoteEmail(data, result.insertedId.toString());
    } catch (error) {
      console.error("Quote email notification failed:", error instanceof Error ? error.message : "Unknown error");
      await requests.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "failed" } }).catch(() => undefined);
      return NextResponse.redirect(new URL(`/pay/printing/${result.insertedId.toString()}?t=${accessToken}&new=1`, req.url), 303);
    }
    await requests.updateOne({ _id: result.insertedId }, { $set: { emailStatus: "sent", emailId, emailSentAt: new Date() } }).catch(() => console.error("Could not record quote email status"));
    return NextResponse.redirect(new URL(`/pay/printing/${result.insertedId.toString()}?t=${accessToken}&new=1`, req.url), 303);
  } catch (error) {
    console.error("Printing request failed:", error instanceof Error ? error.name : "Unknown error");
    return redirect("error=unavailable");
  }
}
