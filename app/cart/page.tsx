import PayNote from "@/components/PayNote";
import Link from "next/link";
import { cookies } from "next/headers";
import { CART_COOKIE, cartDetails, parseCart } from "@/lib/cart";
import { todayInKenya } from "@/lib/dates";

const MESSAGES: Record<string, string> = {
  empty: "Your basket is empty. Add something first.",
  required: "Please enter your name, phone number and a valid email address.",
  items: "Your basket is empty. Add something first.",
  delivery: "Please tell us where to deliver your order.",
  unavailable: "We couldn't send your order right now. Please try again shortly or call us.",
};

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export default async function Cart({ searchParams }: { searchParams: Promise<{ error?: string; added?: string }> }) {
  const params = await searchParams;
  const { items, total, count } = cartDetails(parseCart((await cookies()).get(CART_COOKIE)?.value));
  const message = params.error ? MESSAGES[params.error] : undefined;
  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link>
        <div className="navlinks"><Link href="/">Home</Link><Link href="/products">Products</Link></div>
      </header>
      <main className="formwrap">
        <h1>Your basket</h1>
        <PayNote />
        {params.added && <p className="notice" role="status">Added to your basket.</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        {items.length === 0 ? (
          <>
            <p>Your basket is empty.</p>
            <Link className="btn" href="/products">Browse products</Link>
          </>
        ) : (
          <>
            {items.map((item) => (
              <div className="basket-line" key={item.slug}>
                <div><strong>{item.icon} {item.name}</strong><br /><small>{item.unitPrice ? `${kes(item.unitPrice)} each` : "Price on request"}</small></div>
                <form action="/api/cart" method="post" className="basket-qty">
                  <input type="hidden" name="action" value="set" />
                  <input type="hidden" name="slug" value={item.slug} />
                  <label className="sr-only" htmlFor={`q-${item.slug}`}>Quantity of {item.name}</label>
                  <input id={`q-${item.slug}`} name="quantity" type="number" min={0} max={10000} defaultValue={item.quantity} />
                  <button className="btn outline smallbtn" type="submit">Update</button>
                </form>
                <form action="/api/cart" method="post">
                  <input type="hidden" name="action" value="remove" />
                  <input type="hidden" name="slug" value={item.slug} />
                  <button className="linkbutton" type="submit">Remove</button>
                </form>
              </div>
            ))}
            <p className="basket-total">{count} item{count === 1 ? "" : "s"} · Estimated total <strong>{kes(total)}</strong></p>
            <p className="notice">Prices are a guide. We&rsquo;ll confirm the final total, then send you a link to pay by M-Pesa.</p>

            <h2>Your details</h2>
            <form action="/api/cart/checkout" method="post">
              <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required maxLength={120} /></div>
              <div className="field"><label htmlFor="phone">Phone number (M-Pesa)</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={40} placeholder="07..." /></div>
              <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={200} /></div>
              <div className="field"><label htmlFor="organization">School or organisation (optional)</label><input id="organization" name="organization" maxLength={160} /></div>
              <div className="field">
                <label htmlFor="fulfilment">How would you like to get your order?</label>
                <select id="fulfilment" name="fulfilment" defaultValue="collect">
                  <option value="collect">I&rsquo;ll collect from the shop</option>
                  <option value="delivery">Please deliver (to any county in Kenya)</option>
                </select>
              </div>
              <div className="field"><label htmlFor="preferredDate">Preferred collection or delivery date (optional)</label><input id="preferredDate" name="preferredDate" type="date" min={todayInKenya()} /></div>
              <div className="field"><label htmlFor="deliveryLocation">Delivery location: county and town (if delivering)</label><input id="deliveryLocation" name="deliveryLocation" maxLength={300} /></div>
              <div className="field"><label htmlFor="notes">Anything else? (optional)</label><textarea id="notes" name="notes" rows={3} maxLength={2000} /></div>
              <div className="field hidden-field" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
              <button className="btn" type="submit">Send order</button>
            </form>
          </>
        )}
        <p>Need custom printing? <Link href="/request-printing">Request a printing quote</Link></p>
      </main>
    </>
  );
}
