import { NextResponse } from "next/server";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { consumeEmailCode, normaliseEmail } from "@/lib/email-codes";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const back = (error: string) => NextResponse.redirect(new URL(`/admin/login?error=${error}`, req.url), 303);
  try {
    const db = (await getMongoClient()).db(dbName);
    if (!(await consumeEmailCode(db, "admin-login", form.get("email"), form.get("code")))) return back("invalid");
    const admin = await db.collection("users").findOne({ email: normaliseEmail(form.get("email")), role: "admin" });
    if (!admin) return back("invalid");
    await createSession({ id: admin._id.toString(), name: admin.name, email: admin.email, role: "admin", method: "email-code" });
    return NextResponse.redirect(new URL("/admin", req.url), 303);
  } catch (error) {
    console.error("Admin sign-in failed:", error instanceof Error ? error.name : "Unknown error");
    return back("unavailable");
  }
}
