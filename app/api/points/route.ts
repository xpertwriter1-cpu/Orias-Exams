import { NextResponse } from "next/server";
import { loyaltyPhone } from "@/lib/loyalty";

// Remembers the number for an hour in a private cookie, so it never appears in the page address.
export async function POST(req: Request) {
  const phone = loyaltyPhone((await req.formData()).get("phone"));
  if (!phone) return NextResponse.redirect(new URL("/points?error=phone", req.url), 303);
  const res = NextResponse.redirect(new URL("/points", req.url), 303);
  res.cookies.set("oria_points_phone", phone, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  return res;
}
