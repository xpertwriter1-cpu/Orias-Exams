import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { codeEmailSender } from "@/lib/code-email";
import { requestEmailCode } from "@/lib/email-codes";

export async function POST(req: Request) {
  const form = await req.formData();
  try {
    const client = await getMongoClient();
    // Admins sign in with an email code instead of a password, so this is for customer accounts.
    await requestEmailCode(client.db(dbName), "password-reset", form.get("email"), codeEmailSender("password-reset"), { role: { $ne: "admin" } });
  } catch (error) {
    // The page says the same thing either way, so it never reveals whether an account exists.
    console.error("Password code request failed:", error instanceof Error ? error.message : "Unknown error");
  }
  return NextResponse.redirect(new URL("/reset-password?sent=1", req.url), 303);
}
