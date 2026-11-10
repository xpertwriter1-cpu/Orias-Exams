import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { parseStkCallback } from "@/lib/mpesa";
import { handleCallback } from "@/lib/payments";

// Safaricom sends the payment result here. It always gets "accepted" back, whatever happened,
// so the reply tells an outsider nothing about which payments exist.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const callback = parseStkCallback(await req.json().catch(() => null));
    if (callback) {
      const db = (await getMongoClient()).db(dbName);
      const outcome = await handleCallback(db, token, callback);
      if (outcome === "ignored") console.warn("M-Pesa callback ignored: did not match a waiting payment");
    }
  } catch (error) {
    console.error("M-Pesa callback failed:", error instanceof Error ? error.message : "Unknown error");
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
