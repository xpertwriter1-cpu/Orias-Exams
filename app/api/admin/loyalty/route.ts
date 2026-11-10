import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { addPoints, giveReward, pointsFor } from "@/lib/loyalty";

/** Admin: add points for a shop purchase, or give a free gift (uses 850 points). */
export async function POST(req: Request) {
  const back = (query: string) => NextResponse.redirect(new URL(`/admin?${query}#loyalty`, req.url), 303);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new NextResponse("Request refused", { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url), 303);

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  if (action === "add") {
    const amount = Number(String(form.get("amount") ?? "").replace(/[,\s]/g, ""));
    const note = String(form.get("note") ?? "").trim() || "Shop purchase";
    const saved = await addPoints(admin.db, form.get("phone"), pointsFor(amount), note, admin.session.email, String(form.get("name") ?? "").trim());
    return back(saved ? "loyalty=added" : "loyalty=invalid");
  }
  if (action === "reward") {
    return back((await giveReward(admin.db, form.get("phone"), admin.session.email)) ? "loyalty=given" : "loyalty=not-enough");
  }
  return back("loyalty=invalid");
}
