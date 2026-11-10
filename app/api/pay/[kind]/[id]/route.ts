import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { findByAccessToken, startPayment } from "@/lib/payments";
import { isRequestKind } from "@/lib/request-decisions";

export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const form = await req.formData();
  const token = String(form.get("t") ?? "");
  const page = (query = "") => NextResponse.redirect(new URL(`/pay/${encodeURIComponent(kind)}/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}${query}`, req.url), 303);
  if (!isRequestKind(kind)) return new NextResponse("Not found", { status: 404 });
  try {
    const db = (await getMongoClient()).db(dbName);
    const doc = await findByAccessToken(db, kind, id, token);
    if (!doc) return new NextResponse("Not found", { status: 404 });
    const result = await startPayment(db, kind, doc, form.get("phone"), new URL(req.url).origin);
    return page(result === "sent" || result === "pending" ? "" : `&error=${result}`);
  } catch (error) {
    console.error("Starting M-Pesa payment failed:", error instanceof Error ? error.message : "Unknown error");
    return page("&error=unavailable");
  }
}
