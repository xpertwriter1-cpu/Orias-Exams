import Link from "next/link";
import { products } from "@/data/products";
import { DELIVERY_AREA, LOCATION, PAYBILL, PHONES, SERVICES, WHATSAPP_GROUP } from "@/lib/business";
import { POINTS_TARGET } from "@/lib/loyalty";
import { getSession } from "@/lib/session";

function money(n: number) { return `KES ${n.toLocaleString("en-KE")}`; }

const phoneLinks = PHONES.map((p, i) => <span key={p.tel}>{i > 0 ? " / " : ""}<a href={`tel:${p.tel}`}>{p.display}</a></span>);

export default async function Home() {
  const session = await getSession();
  return (
    <>
      <div className="topbar"><span>📍 {LOCATION}</span><span>☎ {phoneLinks}</span><span>Wholesale &amp; retail · Delivery to {DELIVERY_AREA}</span><span>💳 Cash · Cheque · M-Pesa Paybill {PAYBILL}</span><span><a href={WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">💬 Join our WhatsApp group</a></span></div>
      <nav className="navbar">
        <Link href="/" className="brand"><span className="brandicon">📚</span><span>ORIA<small>EXAM SUPPLIES · Wholesale &amp; Retail</small></span></Link>
        <div className="navlinks">
          <Link href="/">Home</Link><a href="#about">About Us</a><a href="#products">Our Products</a><a href="#services">Services</a><a href="#visit">Find Us</a><a href="#contact">Contact</a><Link href="/points">Rewards</Link><Link href="/cart">Basket</Link>
          {session ? (
            <><span>Signed in as {session.name}</span>{session.role === "admin" && <Link className="btn" href="/admin">Admin</Link>}<form action="/api/auth/logout" method="post"><button className="btn" type="submit">Logout</button></form></>
          ) : (
            <><Link className="btn" href="/login">Login</Link><Link className="btn gold" href="/register">Register</Link></>
          )}
        </div>
      </nav>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">Wholesale &amp; retail · Kericho</div>
            <h1>Quality Exam Materials <span>for a Brighter Future</span></h1>
            <p>Oria Exam Supplies deals in exams and assessment materials for primary and secondary schools and individuals, plus graduation gown hire for PP2, Grade 3, 6 and 9, certificates for graduates (free lamination), photocopying and lamination, office stationery and Supergro organic fertiliser.</p>
            <div className="actions"><a className="btn" href="#products">🛒 Shop Materials</a><a className="btn outline" href="#services">Our Services →</a></div>
          </div>
          <figure className="hero-photo"><img src="/shop-team.webp" alt="The owner of Oria Exam Supplies in her shop, in front of shelves of exam papers and revision books" /><figcaption>Meet the owner of Oria Exam Supplies<small>Karibu to our shop on Temple Road, Kericho</small></figcaption></figure>
        </section>

        <section className="section" id="services">
          <div className="sectionhead"><div><div className="eyebrow">What we do</div><h2>Our Services</h2><p>Wholesale and retail, for schools, institutions and individuals.</p></div></div>
          <div className="services-grid">
            {SERVICES.map((s) => (
              <div className="feature" key={s.title}><span style={{ fontSize: 30 }}>{s.icon}</span><div><b>{s.title}</b><span>{s.text}</span></div></div>
            ))}
          </div>
        </section>

        <section className="rewards-band">
          <div>
            <h2>📱 Rewards for our esteemed customers</h2>
            <p>The more you buy, the more points you earn: 1 point for every KES 1. Reach <strong>{POINTS_TARGET} points</strong> and get a <strong>phone</strong>. Points are saved against your phone number, online or in the shop.</p>
          </div>
          <Link className="btn gold" href="/points">Check my points</Link>
        </section>

        <section className="section" id="visit">
          <div className="sectionhead"><div><div className="eyebrow">Find us</div><h2>Visit our shop</h2><p>We&rsquo;re on {LOCATION}. Look for our sign, or call {phoneLinks}.</p></div><a className="btn whatsapp" href={WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">💬 Join our WhatsApp group</a></div>
          <div className="shop-photos">
            <figure><img src="/shop-sign.webp" alt="Oria Exam&apos;s roadside sign pointing to the photocopy shop, showing 0711 983 880 and 0780 983 880" /><figcaption>Look for our sign on Temple Road</figcaption></figure>
            <figure><img className="top" src="/shop-shelves.webp" alt="Shelves stocked with Super Gro organic fertiliser and KCSE revision books" /><figcaption>Supergro fertiliser and KCSE revision books in stock</figcaption></figure>
          </div>
        </section>

        <section className="section" id="products">
          <div className="sectionhead"><div><div className="eyebrow">Explore our catalogue</div><h2>Our Products</h2><p>Add what you need to your basket and send it as an order.</p></div><Link className="btn outline" href="/products">View All Products →</Link></div>
          <div className="products">{products.slice(0, 4).map((p) => <article className="product" key={p.slug}><div className="productvisual">{p.image ? <img src={p.image} alt={p.imageAlt ?? p.name} /> : p.icon}</div><div className="productbody"><h3>{p.name}</h3><p>{p.description}</p><div className="price">{p.price ? money(p.price) : "Request a quote"}</div><Link className="btn" href={`/products/${p.slug}`}>View Details</Link></div></article>)}</div>
        </section>

        <section className="serviceband">
          <div>
            <div className="eyebrow" style={{ color: "#ffca37" }}>For schools and institutions</div>
            <h2>Printing that meets your needs</h2>
            <p>Request a quote for bulk exam-paper printing, certificates, customised assessment materials, revision booklets, lamination and photocopying. Tell us what you need and our team will follow up.</p>
            <Link className="btn gold" href="/request-printing">Request Printing Quote</Link>
          </div>
          <div id="about">
            <h2>Ways to pay</h2>
            <p>Cash, cheque, or M-Pesa Paybill <strong>{PAYBILL}</strong>. When paying by Paybill for an order, use the reference on your order page as the account number.</p>
            <h2>Supporting better learning</h2>
            <p>Oria Exam Supplies is on {LOCATION}. Materials offered here are revision and assessment resources, not official KNEC examination papers.</p>
          </div>
        </section>
      </main>
      <footer className="footer" id="contact">
        <div className="footergrid">
          <div><div className="brand" style={{ color: "white" }}>📚 ORIA<small style={{ color: "#d7e4f4" }}>EXAM SUPPLIES</small></div><p>Wholesale &amp; retail dealers in exams, assessment, printing and stationery.</p></div>
          <div><b>Visit Us</b><p>{LOCATION}</p><p>We deliver to {DELIVERY_AREA}.</p></div>
          <div><b>Contact</b><p>Phone: {phoneLinks}<br />Pay: Cash, cheque or M-Pesa Paybill {PAYBILL}<br /><a href={WHATSAPP_GROUP} target="_blank" rel="noopener noreferrer">💬 Join our WhatsApp group</a></p></div>
        </div>
        <div className="copyright">© {new Date().getFullYear()} Oria Exam Supplies. All rights reserved. · Kericho, Kenya</div>
      </footer>
    </>
  );
}
