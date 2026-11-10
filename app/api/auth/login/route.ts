import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const requestedNext = String(form.get("next") || "");
  const next = ["/cart", "/products", "/request-printing"].includes(requestedNext) ? requestedNext : "/";
  const loginUrl = (error: string) => {
    const url = new URL("/login", req.url);
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
    await createSession({ id: user._id.toString(), name: user.name, email: user.email, role: user.role || "customer" });
    return NextResponse.redirect(new URL(user.role === "admin" && next === "/" ? "/admin" : next, req.url), 303);
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.redirect(loginUrl("unavailable"), 303);
  }
}
