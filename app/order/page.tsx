import Link from "next/link";
import { DELIVERY_AREA } from "@/lib/business";
import { todayInKenya } from "@/lib/dates";
import { orderableProducts } from "@/lib/order-request";

const MESSAGES: Record<string, string> = {
  required: "Please enter your name, phone number and a valid email address.",
  items: "Please choose at least one item, or describe what you need.",
  delivery: "Please tell us where to deliver your order.",
  unavailable: "We couldn't send your request right now. Please try again shortly or call us.",
};

export default async function Order({ searchParams }: { searchParams: Promise<{ item?: string; success?: string; error?: string }> }) {
  const params = await searchParams;
  const message = params.error ? MESSAGES[params.error] : undefined;
  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link>
        <div className="navlinks"><Link href="/">Home</Link><Link href="/products">Products</Link></div>
      </header>
      <main className="formwrap">
        <h1>Request an order</h1>
        <p>Order books, exam materials and stationery. No account needed. We&rsquo;ll contact you to confirm prices, availability and payment.</p>
        {params.success === "1" && <p className="notice" role="status">Thank you. We&rsquo;ve received your order request and will contact you soon.</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <form action="/api/order-request" method="post">
          <h2>What you need</h2>
          {orderableProducts.map((p) => (
            <div className="field" key={p.slug}>
              <label htmlFor={`qty-${p.slug}`}>{p.icon} {p.name}{p.price ? ` (about KES ${p.price.toLocaleString("en-KE")} each)` : ""}</label>
              <input id={`qty-${p.slug}`} name={`qty-${p.slug}`} type="number" min={0} max={10000} defaultValue={params.item === p.slug ? 1 : 0} />
            </div>
          ))}
          <div className="field">
            <label htmlFor="otherItems">Other books or stationery</label>
            <textarea id="otherItems" name="otherItems" rows={3} maxLength={2000} placeholder="For example: 10 exercise books, 5 boxes of pens" />
          </div>

          <h2>Your details</h2>
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required maxLength={120} /></div>
          <div className="field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="+254..." /></div>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={200} /></div>
          <div className="field"><label htmlFor="organization">School or organisation (optional)</label><input id="organization" name="organization" maxLength={160} /></div>

          <h2>Collection or delivery</h2>
          <div className="field">
            <label htmlFor="fulfilment">How would you like to get your order?</label>
            <select id="fulfilment" name="fulfilment" defaultValue="collect">
              <option value="collect">I&rsquo;ll collect from the shop</option>
              <option value="delivery">Please deliver (anywhere in {DELIVERY_AREA})</option>
            </select>
          </div>
          <div className="field"><label htmlFor="preferredDate">Preferred collection or delivery date (optional)</label><input id="preferredDate" name="preferredDate" type="date" min={todayInKenya()} /></div>
          <div className="field"><label htmlFor="deliveryLocation">Delivery location in {DELIVERY_AREA} (if delivering)</label><input id="deliveryLocation" name="deliveryLocation" maxLength={300} /></div>
          <div className="field"><label htmlFor="notes">Anything else? (optional)</label><textarea id="notes" name="notes" rows={3} maxLength={2000} /></div>
          <div className="field hidden-field" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>

          <button className="btn" type="submit">Send order request</button>
        </form>
        <p>Need custom printing instead? <Link href="/request-printing">Request a printing quote</Link></p>
      </main>
    </>
  );
}
