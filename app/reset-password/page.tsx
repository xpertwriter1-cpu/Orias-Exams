import Link from "next/link";

const MESSAGES: Record<string, string> = {
  invalid: "That code is wrong or has expired. Check the latest email, or ask for a new code.",
  weak: "Your new password must be at least 8 characters.",
  mismatch: "The two passwords don't match. Please type them again.",
  unavailable: "We couldn't change your password right now. Please try again shortly.",
};

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const params = await searchParams;
  const message = params.error ? MESSAGES[params.error] : undefined;
  return (
    <>
      <header className="navbar"><Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link></header>
      <main className="formwrap">
        <h1>Enter your code</h1>
        {params.sent === "1" && (
          <p className="notice" role="status">If that email has an account, a 6-digit code is on its way. It expires in 10 minutes. Check your spam folder too.</p>
        )}
        {message && <p className="notice" role="alert">{message}</p>}
        <form action="/api/auth/reset-password" method="post">
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div className="field"><label htmlFor="code">6-digit code</label><input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\s*\d{6}\s*" maxLength={8} required /></div>
          <div className="field"><label htmlFor="password">New password (at least 8 characters)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
          <div className="field"><label htmlFor="confirm">Type the new password again</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></div>
          <button className="btn" type="submit">Change password</button>
        </form>
        <p>No code? <Link href="/forgot-password">Send a new one</Link></p>
      </main>
    </>
  );
}
