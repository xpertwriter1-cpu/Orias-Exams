import Link from "next/link";
import { redirect } from "next/navigation";
import { emailConfigured } from "@/lib/email-config";
import { getSession } from "@/lib/session";

type Params = { error?: string; registered?: string; next?: string; reset?: string; as?: string };

const MESSAGES: Record<string, string> = {
  invalid: "Incorrect email or password. Guests need to create an account before signing in.",
  "not-admin": "That account isn't an admin. Choose Guest to sign in as a customer.",
  unavailable: "We could not sign you in right now. Please try again shortly or contact support.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const next = ["/cart", "/products", "/request-printing"].includes(params.next || "") ? params.next! : "/";
  const session = await getSession();
  if (session) redirect(session.role === "admin" && next === "/" ? "/admin" : next);
  const asAdmin = params.as === "admin";
  const message = params.error ? MESSAGES[params.error] : undefined;
  const tab = (value: "guest" | "admin") => `/login?as=${value}${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <>
      <header className="navbar"><Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link></header>
      <main className="formwrap">
        <h1>Welcome back</h1>
        <nav className="login-tabs" aria-label="Sign in as">
          <Link href={tab("guest")} className={asAdmin ? "" : "on"} aria-current={asAdmin ? undefined : "page"}>Guest</Link>
          <Link href={tab("admin")} className={asAdmin ? "on" : ""} aria-current={asAdmin ? "page" : undefined}>Admin</Link>
        </nav>

        {message && <p className="notice" role="alert">{message}</p>}
        {params.reset === "1" && <p className="notice" role="status">Your password was changed. Please sign in with your new password.</p>}
        {params.registered === "1" && <p className="notice" role="status">Your account was created. Please sign in.</p>}

        {asAdmin ? (
          emailConfigured() ? (
            <>
              <p>Admins sign in with a code sent to their email.</p>
              <Link className="btn" href="/admin/login">Get an admin sign-in code</Link>
            </>
          ) : (
            <>
              <p>Sign in with your admin email and password.</p>
              <form action="/api/auth/login" method="post">
                <input type="hidden" name="as" value="admin" />
                <div className="field"><label htmlFor="email">Admin email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
                <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
                <button className="btn" type="submit">Sign in as admin</button>
              </form>
            </>
          )
        ) : (
          <>
            <p>New here? <Link href="/register">Create an account</Link> first, then sign in below to manage your orders.</p>
            <form action="/api/auth/login" method="post">
              <input type="hidden" name="as" value="guest" />
              <input type="hidden" name="next" value={next} />
              <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
              <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
              <button className="btn" type="submit">Sign in</button>
            </form>
            <p><Link href="/forgot-password">Forgot your password?</Link></p>
            <p>Just want to order? <Link href="/order">Request an order without an account</Link></p>
          </>
        )}
      </main>
    </>
  );
}
