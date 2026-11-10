import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { resetPasswordWithCode } from "@/lib/email-codes";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");
  const back = (error: string) => NextResponse.redirect(new URL(`/reset-password?error=${error}`, req.url), 303);
  if (password !== String(form.get("confirm") || "")) return back("mismatch");
  try {
    const client = await getMongoClient();
    const result = await resetPasswordWithCode(client.db(dbName), form.get("email"), form.get("code"), password);
    if (result !== "ok") return back(result);
    return NextResponse.redirect(new URL("/login?reset=1", req.url), 303);
  } catch (error) {
    console.error("Password reset failed:", error instanceof Error ? error.name : "Unknown error");
    return back("unavailable");
  }
}
