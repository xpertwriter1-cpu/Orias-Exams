import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { sendCustomerEmail } from "@/lib/customer-email";
import { emailConfigured } from "@/lib/email-config";
import { COLLECTIONS, applyDecision, customerMessage, isRequestKind, parseDecision } from "@/lib/request-decisions";

export async function POST(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const back = (query: string) => NextResponse.redirect(new URL(`/admin?${query}#req-${encodeURIComponent(id)}`, req.url), 303);

  // Only accept the dashboard's own form.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return new NextResponse("Request refused", { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url), 303);
  if (!isRequestKind(kind)) return back("error=missing");

  const input = parseDecision(await req.formData());
  if ("error" in input) return back(`error=${input.error}`);
  try {
    const updated = await applyDecision(admin.db, kind, id, input, admin.session.email);
    if (!updated) return back("error=missing");

    // Email the customer automatically once email is set up. The dashboard also offers email and WhatsApp buttons.
    let customerEmail = "not-configured";
    const message = customerMessage(kind, updated, new URL(req.url).origin);
    if (emailConfigured() && message && updated.email) {
      try {
        await sendCustomerEmail(String(updated.email), message.subject, message.text, `${kind}-decision/${id}/${(updated.history ?? []).length}`);
        customerEmail = "sent";
      } catch (error) {
        console.error("Customer email failed:", error instanceof Error ? error.message : "Unknown error");
        customerEmail = "failed";
      }
    }
    await admin.db.collection(COLLECTIONS[kind]).updateOne({ _id: updated._id }, { $set: { customerEmailStatus: customerEmail } });
    return back("saved=1");
  } catch (error) {
    console.error("Saving decision failed:", error instanceof Error ? error.name : "Unknown error");
    return back("error=unavailable");
  }
}
