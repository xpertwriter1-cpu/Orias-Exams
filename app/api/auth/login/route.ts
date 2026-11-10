import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { emailConfigured } from "@/lib/email-config";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const requestedNext = String(form.get("next") || "");
  const next = ["/cart", "/products", "/request-printing"].includes(requestedNext) ? requestedNext : "/";
  const asAdmin = form.get("as") === "admin";
  const loginUrl = (error: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("as", asAdmin ? "admin" : "guest");
    url.searchParams.set("error", error);
    if (next !== "/") url.searchParams.set("next", next);
    return url;
  };
  const invalid = () => NextResponse.redirect(loginUrl("invalid"), 303);
  if (!email || !password) return invalid();
  try {
    const client = await getMongoClient();
    const user = await client.db(dbName).collection("users").findOne({ email });
    if (!user || !(await bcrypt.compare(password, String(user.passwordHash)))) return invalid();
    if (asAdmin && user.role !== "admin") return NextResponse.redirect(loginUrl("not-admin"), 303);
    if (user.role === "admin") {
      // Once email is set up, admins must use an emailed code. Until then their password works.
      if (emailConfigured()) return NextResponse.redirect(new URL("/admin/login?use=code", req.url), 303);
      await createSession({ id: user._id.toString(), name: user.name, email: user.email, role: "admin" });
      return NextResponse.redirect(new URL("/admin", req.url), 303);
    }
    await createSession({ id: user._id.toString(), name: user.name, email: user.email, role: user.role || "customer" });
    return NextResponse.redirect(new URL(next, req.url), 303);
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.redirect(loginUrl("unavailable"), 303);
  }
}
