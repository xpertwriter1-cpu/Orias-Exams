import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getMongoClient, { dbName } from "@/lib/mongodb";

export async function POST(req: Request) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const phone = String(form.get("phone") || "").trim();
  const accountType = String(form.get("accountType") || "individual");
  const password = String(form.get("password") || "");
  const failure = (error: string) => NextResponse.redirect(new URL(`/register?error=${error}`, req.url), 303);
  if (!name || !email || password.length < 8) return failure("invalid");
  let accountCreated = false;
  try {
    const client = await getMongoClient();
    const users = client.db(dbName).collection("users");
    if (await users.findOne({ email })) return failure("email-exists");
    const passwordHash = await bcrypt.hash(password, 12);
    await users.insertOne({ name, email, phone, accountType, passwordHash, role: "customer", createdAt: new Date() });
    accountCreated = true;
    // Guests create an account first, then sign in.
    return NextResponse.redirect(new URL("/login?as=guest&registered=1", req.url), 303);
  } catch (error) {
    console.error("Registration failed:", error instanceof Error ? error.name : "Unknown error");
    if (accountCreated) return NextResponse.redirect(new URL("/login?as=guest&registered=1", req.url), 303);
    return failure("unavailable");
  }
}
