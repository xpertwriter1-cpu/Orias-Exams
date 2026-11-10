import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CART_COOKIE, parseCart, serializeCart, updateCart, type CartAction } from "@/lib/cart";

const ACTIONS: CartAction[] = ["add", "set", "remove", "clear"];

export async function POST(req: Request) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "add") as CartAction;
  const slug = String(form.get("slug") ?? "");
  // Only return to pages on this site.
  const requested = String(form.get("back") ?? "/cart");
  const back = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/cart";
  if (!ACTIONS.includes(action)) return NextResponse.redirect(new URL(back, req.url), 303);

  const lines = updateCart(parseCart((await cookies()).get(CART_COOKIE)?.value), action, slug, form.get("quantity") ?? 1);
  const target = new URL(back, req.url);
  if (action === "add") target.searchParams.set("added", slug);
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(CART_COOKIE, serializeCart(lines), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
