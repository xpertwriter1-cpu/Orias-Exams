import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import getMongoClient, { dbName } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
const EMAIL_STATUS: Record<string, string> = { sent: "Emailed", failed: "Email failed", pending: "Not emailed yet" };

export default async function Admin() {
  const s = await getSession();
  // Only a sign-in made with an emailed code opens the dashboard.
  if (!s || s.role !== "admin" || (s as { method?: string }).method !== "email-code") redirect("/admin/login");
  const db = (await getMongoClient()).db(dbName);

  // Check the account itself, so access ends as soon as the admin role is removed.
  const account = await db.collection("users").findOne({ email: s.email });
  if (!account || account.role !== "admin") redirect("/admin/login");

  const [users, requestCount, orderCount, requests, orders] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("printingRequests").countDocuments(),
    db.collection("orderRequests").countDocuments(),
    db.collection("printingRequests").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection("orderRequests").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);

  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/">📚 ORIA <small>ADMIN DASHBOARD</small></Link>
        <form action="/api/auth/logout" method="post"><button className="btn outline">Logout</button></form>
      </header>
      <main className="section">
        <div className="eyebrow">Administration</div>
        <h1>Welcome, {s.name}</h1>
        <p>Basic overview of your website activity.</p>
        <div className="products">
          <article className="product"><div className="productbody"><h3>Registered users</h3><h2>{users}</h2></div></article>
          <article className="product"><div className="productbody"><h3>Printing requests</h3><h2>{requestCount}</h2></div></article>
          <article className="product"><div className="productbody"><h3>Order requests</h3><h2>{orderCount}</h2></div></article>
        </div>

        <h2 id="orders">Order requests</h2>
        <p>Books and stationery requested by visitors. The 50 most recent, newest first.</p>
        {orders.length === 0 ? (
          <p className="notice">No order requests yet.</p>
        ) : (
          <div className="requests-wrap">
            <table className="requests">
              <thead>
                <tr><th>Received</th><th>Customer</th><th>Items</th><th>Collection or delivery</th><th>Notes</th><th>Email to you</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id.toString()}>
                    <td>{o.createdAt instanceof Date ? dateFormat.format(o.createdAt) : ""}</td>
                    <td>
                      {String(o.name ?? "")}{o.organization ? <><br />{String(o.organization)}</> : null}<br />
                      <a href={`mailto:${String(o.email ?? "")}`}>{String(o.email ?? "")}</a><br />
                      <a href={`tel:${String(o.phone ?? "").replace(/\s/g, "")}`}>{String(o.phone ?? "")}</a>
                    </td>
                    <td className="details">
                      {Array.isArray(o.items) && o.items.map((item: { name?: string; quantity?: number }, index: number) => (
                        <div key={index}>{Number(item.quantity ?? 0)} × {String(item.name ?? "")}</div>
                      ))}
                      {o.otherItems ? <div>Other: {String(o.otherItems)}</div> : null}
                    </td>
                    <td>{o.fulfilment === "delivery" ? <>Delivery to {String(o.deliveryLocation ?? "")}</> : "Collect from shop"}</td>
                    <td className="details">{String(o.notes ?? "")}</td>
                    <td>{EMAIL_STATUS[String(o.emailStatus)] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 id="requests">Printing requests</h2>
        <p>The 50 most recent, newest first.</p>
        {requests.length === 0 ? (
          <p className="notice">No printing requests yet.</p>
        ) : (
          <div className="requests-wrap">
            <table className="requests">
              <thead>
                <tr><th>Received</th><th>School / organisation</th><th>Contact</th><th>Service</th><th>Quantity / details</th><th>Email to you</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r._id.toString()}>
                    <td>{r.createdAt instanceof Date ? dateFormat.format(r.createdAt) : ""}</td>
                    <td>{String(r.organization ?? "")}</td>
                    <td>
                      {String(r.contactName ?? "")}<br />
                      <a href={`mailto:${String(r.email ?? "")}`}>{String(r.email ?? "")}</a><br />
                      <a href={`tel:${String(r.phone ?? "").replace(/\s/g, "")}`}>{String(r.phone ?? "")}</a>
                    </td>
                    <td>{String(r.service ?? "")}</td>
                    <td className="details">{String(r.details ?? "")}</td>
                    <td>{EMAIL_STATUS[String(r.emailStatus)] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="notice">The public product catalogue currently uses starter sample data in data/products.ts. A production admin product editor and order workflow are the next implementation stage.</p>
      </main>
    </>
  );
}
