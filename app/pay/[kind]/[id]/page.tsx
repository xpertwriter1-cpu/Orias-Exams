import Link from "next/link";
import { notFound } from "next/navigation";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { PAYBILL, PHONES, paymentReference } from "@/lib/business";
import { formatDate } from "@/lib/dates";
import { mpesaConfig } from "@/lib/mpesa";
import { canPay, findByAccessToken, paymentStatus, refreshPayment } from "@/lib/payments";
import { STATUS_LABELS, isRequestKind } from "@/lib/request-decisions";

export const dynamic = "force-dynamic";

const START_MESSAGES: Record<string, string> = {
  phone: "Please enter a Safaricom number, for example 0712 345 678.",
  "too-many": "Too many payment attempts. Please wait 10 minutes and try again.",
  failed: "M-Pesa couldn't send the payment prompt. Please try again.",
  "not-configured": "The phone prompt isn't switched on yet. Please use the Paybill details below.",
  "not-payable": "This request isn't ready for payment.",
  unavailable: "Something went wrong. Please try again shortly.",
};

const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export default async function PayPage({ params, searchParams }: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ t?: string; new?: string; error?: string }>;
}) {
  const { kind, id } = await params;
  const query = await searchParams;
  if (!isRequestKind(kind)) notFound();
  const db = (await getMongoClient()).db(dbName);
  let doc = await findByAccessToken(db, kind, id, query.t);
  if (!doc) notFound();

  // A prompt that's been waiting a while gets checked with Safaricom.
  const before = paymentStatus(doc);
  if (before === "pending" && (await refreshPayment(db, kind, doc)) !== before) doc = await findByAccessToken(db, kind, id, query.t);
  if (!doc) notFound();

  const status = String(doc.status ?? "new");
  const payment = paymentStatus(doc);
  const amount = Number(doc.amountDue);
  const configured = Boolean(mpesaConfig());
  const message = query.error ? START_MESSAGES[query.error] ?? START_MESSAGES.unavailable : undefined;

  return (
    <>
      {payment === "pending" && <meta httpEquiv="refresh" content="5" />}
      <header className="navbar"><Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link></header>
      <main className="formwrap">
        <h1>{kind === "order" ? "Your order" : "Your printing request"}</h1>
        {query.new === "1" && <p className="notice" role="status">Thank you. We&rsquo;ve received it. Keep this page&rsquo;s link to check its progress and pay once it&rsquo;s confirmed.</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <p>Status: <span className={`status-badge status-${status}`}>{payment === "paid" ? "Paid" : STATUS_LABELS[status] ?? status}</span></p>
        <div className="details">
          {kind === "order"
            ? <>{Array.isArray(doc.items) && doc.items.map((i: { name?: string; quantity?: number }, n: number) => <div key={n}>{Number(i.quantity ?? 0)} × {String(i.name ?? "")}</div>)}{doc.otherItems ? <div>Other: {String(doc.otherItems)}</div> : null}</>
            : <div>{String(doc.service ?? "")}: {String(doc.details ?? "")}</div>}
          {typeof doc.preferredDate === "string" && doc.preferredDate && <div>Preferred date: {formatDate(doc.preferredDate)}</div>}
        </div>

        {status === "new" && <p>We&rsquo;re checking your request and will confirm the price and date soon.</p>}
        {status === "rejected" && <p>Sorry, we can&rsquo;t take on this request.{doc.decisionNote ? ` ${String(doc.decisionNote)}` : ""}</p>}
        {status === "reschedule" && (
          <p>We can&rsquo;t do the date you asked for. {typeof doc.proposedDate === "string" ? <>We can offer <strong>{formatDate(doc.proposedDate)}</strong>. </> : null}{doc.decisionNote ? String(doc.decisionNote) : ""} Please reply to our message or call us to confirm.</p>
        )}
        {status === "approved" && !(amount > 0) && <p>Your request is approved. We&rsquo;ll contact you about collection and payment.{doc.decisionNote ? ` ${String(doc.decisionNote)}` : ""}</p>}

        {payment === "paid" && (
          <p className="notice" role="status">Paid {kes(Number(doc.payment?.amount ?? amount))}. Thank you!{doc.payment?.receipt ? ` M-Pesa receipt: ${String(doc.payment.receipt)}.` : ""}</p>
        )}
        {payment === "pending" && (
          <p className="notice" role="status">Check your phone and enter your M-Pesa PIN to pay {kes(Number(doc.payment?.amount ?? amount))}. This page updates by itself.</p>
        )}
        {payment === "failed" && canPay(doc) && <p className="notice" role="alert">The last payment didn&rsquo;t go through{doc.payment?.resultDesc ? ` (${String(doc.payment.resultDesc)})` : ""}. You can try again.</p>}

        {canPay(doc) && payment !== "pending" && (
          <>
            <h2>Pay {kes(amount)} by M-Pesa</h2>
            {configured ? (
              <form action={`/api/pay/${kind}/${id}`} method="post">
                <input type="hidden" name="t" value={String(query.t)} />
                <div className="field"><label htmlFor="phone">Safaricom number to pay from</label><input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="07..." defaultValue={String(doc.phone ?? "")} /></div>
                <button className="btn" type="submit">Send M-Pesa prompt to my phone</button>
              </form>
            ) : null}
            <div className="notice paybill">
              <strong>{configured ? "Or pay with M-Pesa Paybill" : "Pay with M-Pesa Paybill"}</strong>
              <div>Business number: <strong>{PAYBILL}</strong></div>
              <div>Account number: <strong>{paymentReference(id)}</strong></div>
              <div>Amount: <strong>{kes(amount)}</strong></div>
              <small>We&rsquo;ll mark your order as paid once we see the payment. You can also pay by cash or cheque at the shop.</small>
            </div>
          </>
        )}
        <p>Questions? Call {PHONES.map((p) => p.display).join(" or ")}.</p>
        <p><Link href="/products">Continue shopping</Link></p>
      </main>
    </>
  );
}
