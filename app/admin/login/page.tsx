import Link from "next/link";
import { redirect } from "next/navigation";
import { emailConfigured } from "@/lib/email-config";
import { getSession } from "@/lib/session";

const MESSAGES: Record<string, string> = {
  invalid: "That code is wrong or has expired. Check the latest email, or ask for a new code.",
  unavailable: "We couldn't sign you in right now. Please try again shortly.",
};

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; use?: string }> }) {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");
  const params = await searchParams;
  const message = params.error ? MESSAGES[params.error] : undefined;
  return (
    <>
      <header className="navbar"><Link className="brand" href="/">📚 ORIA <small>ADMIN SIGN-IN</small></Link></header>
      <main className="formwrap">
        <h1>Admin sign-in</h1>
        {!emailConfigured() && (
          <p className="notice" role="status">Email codes aren&rsquo;t switched on yet. For now, <Link href="/login">sign in with your password</Link>.</p>
        )}
        {params.use === "code" && <p className="notice" role="status">Admin accounts sign in with a code sent to your email instead of a password.</p>}
        {params.sent === "1" && <p className="notice" role="status">If that email belongs to an admin, a 6-digit code is on its way. It expires in 10 minutes. Check your spam folder too.</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <h2>1. Get a code</h2>
        <form action="/api/auth/admin-code" method="post">
          <div className="field"><label htmlFor="send-email">Admin email address</label><input id="send-email" name="email" type="email" autoComplete="email" required /></div>
          <button className="btn" type="submit">Email me a code</button>
        </form>

        <h2>2. Enter the code</h2>
        <form action="/api/auth/admin-verify" method="post">
          <div className="field"><label htmlFor="email">Admin email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="field"><label htmlFor="code">6-digit code</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\s*\d{6}\s*" maxLength={8} required /></div>
          <button className="btn" type="submit">Sign in</button>
        </form>
      </main>
    </>
  );
}
