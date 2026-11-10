import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { codeEmailSender } from "@/lib/code-email";
import { requestEmailCode } from "@/lib/email-codes";

export async function POST(req: Request) {
  const form = await req.formData();
  try {
    const client = await getMongoClient();
    await requestEmailCode(client.db(dbName), "admin-login", form.get("email"), codeEmailSender("admin-login"), { role: "admin" });
  } catch (error) {
    // Same reply either way, so nobody can test which emails are admin accounts.
    console.error("Admin code request failed:", error instanceof Error ? error.message : "Unknown error");
  }
  return NextResponse.redirect(new URL("/admin/login?sent=1", req.url), 303);
}
