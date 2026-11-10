import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { markPaidManually } from "@/lib/payments";
import { isRequestKind } from "@/lib/request-decisions";

/** The admin records a payment made another way, such as cash or M-Pesa sent directly. */
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const back = (query: string) => NextResponse.redirect(new URL(`/admin?${query}#req-${encodeURIComponent(id)}`, req.url), 303);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new NextResponse("Request refused", { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url), 303);
  if (!isRequestKind(kind)) return back("error=missing");
  const form = await req.formData();
  const saved = await markPaidManually(admin.db, kind, id, String(form.get("receipt") ?? "").trim(), admin.session.email);
  return back(saved ? "saved=1" : "error=missing");
}
