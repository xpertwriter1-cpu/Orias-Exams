import Link from "next/link";
import { cookies } from "next/headers";
import getMongoClient, { dbName } from "@/lib/mongodb";
import { POINTS_PER_KES, POINTS_TARGET, displayPhone, getLoyalty } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function Points({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const phone = (await cookies()).get("oria_points_phone")?.value;
  const record = phone ? await getLoyalty((await getMongoClient()).db(dbName), phone) : null;
  const points = Number(record?.points ?? 0);
  const percent = Math.min(100, Math.round((points / POINTS_TARGET) * 100));

  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link>
        <div className="navlinks"><Link href="/">Home</Link><Link href="/products">Products</Link><Link href="/cart">Basket</Link></div>
      </header>
      <main className="formwrap">
        <h1>📱 Loyalty rewards</h1>
        <p>Earn <strong>{POINTS_PER_KES} point for every KES 1</strong> you spend with us. Reach <strong>{POINTS_TARGET} points</strong> and get a <strong>phone</strong>.</p>
        <p>Points are saved against your phone number, so you collect them whether you order online or buy in the shop.</p>

        <form action="/api/points" method="post" className="inline-form">
          <div className="field"><label htmlFor="phone">Check your points: phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="07..." /></div>
          <button className="btn" type="submit">Check</button>
        </form>
        {params.error === "phone" && <p className="notice" role="alert">Please enter a Safaricom number, for example 0712 345 678.</p>}

        {phone && (
          <div className="points-card">
            <p>{displayPhone(phone)}</p>
            <p className="points-total"><strong>{points.toLocaleString("en-KE")}</strong> points</p>
            <div className="points-bar" role="progressbar" aria-valuemin={0} aria-valuemax={POINTS_TARGET} aria-valuenow={Math.min(points, POINTS_TARGET)} aria-label="Progress to your phone"><span style={{ width: `${percent}%` }} /></div>
            {points >= POINTS_TARGET
              ? <p className="notice" role="status">🎉 You&rsquo;ve earned a phone! Show this number at the shop to collect it.</p>
              : <p>{(POINTS_TARGET - points).toLocaleString("en-KE")} more points to your phone.</p>}
            {Number(record?.rewardsGiven ?? 0) > 0 && <p>Phones collected so far: {Number(record?.rewardsGiven)}</p>}
            {Array.isArray(record?.history) && record.history.length > 0 && (
              <>
                <h2>Recent points</h2>
                {record.history.slice(-5).reverse().map((h: { at: Date; points: number; reason: string }, i: number) => (
                  <div key={i} className="points-row"><span>{h.at instanceof Date ? day.format(h.at) : ""} · {h.reason}</span><strong>{h.points > 0 ? `+${h.points}` : h.points}</strong></div>
                ))}
              </>
            )}
            {!record && <p>No points yet for this number. They&rsquo;re added once an order is paid.</p>}
          </div>
        )}
      </main>
    </>
  );
}
