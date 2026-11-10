import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Document } from "mongodb";
import { getAdmin } from "@/lib/admin-auth";
import { formatDate, todayInKenya } from "@/lib/dates";
import { STATUS_LABELS, customerMessage, mailtoLink, whatsappLink, type RequestKind } from "@/lib/request-decisions";

export const dynamic = "force-dynamic";

const received = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
const NOTIFY_EMAIL: Record<string, string> = { sent: "Emailed to you", failed: "Email to you failed", pending: "Not emailed to you" };
const CUSTOMER_EMAIL: Record<string, string> = { sent: "Customer emailed automatically.", failed: "Automatic email to the customer failed. Use the buttons below." };
const ERRORS: Record<string, string> = {
  decision: "Choose Approve, Reject or Suggest another date.",
  date: "Choose a new date from today onwards.",
  missing: "That request couldn't be found.",
  unavailable: "The change couldn't be saved. Please try again.",
};

function RequestCard({ kind, r, siteUrl, today }: { kind: RequestKind; r: Document; siteUrl: string; today: string }) {
  const id = r._id.toString();
  const status = String(r.status ?? "new");
  const message = customerMessage(kind, r, siteUrl);
  const name = String((kind === "order" ? r.name : r.contactName) ?? "");
  const email = String(r.email ?? "");
  const phone = String(r.phone ?? "");
  const mail = message ? mailtoLink(email, message.subject, message.text) : null;
  const whatsapp = message ? whatsappLink(phone, message.text) : null;

  return (
    <article className="request-card" id={`req-${id}`}>
      <header>
        <span className={`status-badge status-${status}`}>{STATUS_LABELS[status] ?? status}</span>
        <small>{r.createdAt instanceof Date ? received.format(r.createdAt) : ""} · {NOTIFY_EMAIL[String(r.emailStatus)] ?? ""}</small>
      </header>

      <div className="request-grid">
        <div>
          <h3>{kind === "order" ? name : String(r.organization ?? "")}</h3>
          {kind === "order" ? (r.organization ? <p>{String(r.organization)}</p> : null) : <p>{name}</p>}
          <p><a href={`mailto:${email}`}>{email}</a><br /><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></p>
        </div>
        <div className="details">
          {kind === "order" ? (
            <>
              {Array.isArray(r.items) && r.items.map((item: { name?: string; quantity?: number }, i: number) => <div key={i}>{Number(item.quantity ?? 0)} × {String(item.name ?? "")}</div>)}
              {r.otherItems ? <div>Other: {String(r.otherItems)}</div> : null}
              <div>{r.fulfilment === "delivery" ? `Delivery to ${String(r.deliveryLocation ?? "")}` : "Collect from shop"}</div>
              {r.notes ? <div>Notes: {String(r.notes)}</div> : null}
            </>
          ) : (
            <>
              <div><strong>{String(r.service ?? "")}</strong></div>
              <div>{String(r.details ?? "")}</div>
            </>
          )}
          <div>Preferred date: {typeof r.preferredDate === "string" && r.preferredDate ? formatDate(r.preferredDate) : "not given"}</div>
        </div>
      </div>

      {status !== "new" && (
        <div className="decision">
          {status === "reschedule" && typeof r.proposedDate === "string" && <p>New date suggested: <strong>{formatDate(r.proposedDate)}</strong></p>}
          {r.decisionNote ? <p>Your message: {String(r.decisionNote)}</p> : null}
          {CUSTOMER_EMAIL[String(r.customerEmailStatus)] && <p>{CUSTOMER_EMAIL[String(r.customerEmailStatus)]}</p>}
          <div className="actions">
            {mail && <a className="btn outline smallbtn" href={mail}>Email customer</a>}
            {whatsapp && <a className="btn outline smallbtn" href={whatsapp} target="_blank" rel="noreferrer noopener">WhatsApp customer</a>}
          </div>
        </div>
      )}

      <form className="decision-form" action={`/api/admin/requests/${kind}/${id}`} method="post">
        <fieldset>
          <legend>{status === "new" ? "Decide" : "Change decision"}</legend>
          <label><input type="radio" name="decision" value="approved" required defaultChecked={status === "approved"} /> Approve</label>
          <label><input type="radio" name="decision" value="rejected" defaultChecked={status === "rejected"} /> Reject</label>
          <label><input type="radio" name="decision" value="reschedule" defaultChecked={status === "reschedule"} /> Suggest another date</label>
        </fieldset>
        <div className="field"><label htmlFor={`date-${id}`}>New date (only for &ldquo;Suggest another date&rdquo;)</label><input id={`date-${id}`} name="proposedDate" type="date" min={today} defaultValue={typeof r.proposedDate === "string" ? r.proposedDate : ""} /></div>
        <div className="field"><label htmlFor={`note-${id}`}>Message to the customer (optional)</label><textarea id={`note-${id}`} name="note" rows={2} maxLength={1000} defaultValue={String(r.decisionNote ?? "")} /></div>
        <button className="btn smallbtn" type="submit">Save</button>
      </form>
    </article>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const { session: s, db } = admin;
  const params = await searchParams;
  const host = (await headers()).get("host") ?? "orias-exams.vercel.app";
  const siteUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const today = todayInKenya();

  const [users, orders, requests] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("orderRequests").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection("printingRequests").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  const waiting = [...orders, ...requests].filter((r) => (r.status ?? "new") === "new").length;

  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/">📚 ORIA <small>ADMIN DASHBOARD</small></Link>
        <form action="/api/auth/logout" method="post"><button className="btn outline">Logout</button></form>
      </header>
      <main className="section">
        <div className="eyebrow">Administration</div>
        <h1>Welcome, {s.name}</h1>
        {params.saved === "1" && <p className="notice" role="status">Saved. Let the customer know using the buttons on that request.</p>}
        {params.error && <p className="notice" role="alert">{ERRORS[params.error] ?? ERRORS.unavailable}</p>}
        <div className="products">
          <article className="product"><div className="productbody"><h3>Waiting for a decision</h3><h2>{waiting}</h2></div></article>
          <article className="product"><div className="productbody"><h3>Order requests</h3><h2>{orders.length}</h2></div></article>
          <article className="product"><div className="productbody"><h3>Printing requests</h3><h2>{requests.length}</h2></div></article>
          <article className="product"><div className="productbody"><h3>Registered users</h3><h2>{users}</h2></div></article>
        </div>

        <h2 id="orders">Order requests</h2>
        {orders.length === 0 ? <p className="notice">No order requests yet.</p> : orders.map((r) => <RequestCard key={r._id.toString()} kind="order" r={r} siteUrl={siteUrl} today={today} />)}

        <h2 id="requests">Printing requests</h2>
        {requests.length === 0 ? <p className="notice">No printing requests yet.</p> : requests.map((r) => <RequestCard key={r._id.toString()} kind="printing" r={r} siteUrl={siteUrl} today={today} />)}
      </main>
    </>
  );
}
