import Link from "next/link";

export default function ForgotPassword() {
  return (
    <>
      <header className="navbar"><Link className="brand" href="/">📚 ORIA <small>EXAM SUPPLIES</small></Link></header>
      <main className="formwrap">
        <h1>Change your password</h1>
        <p>Enter your account email. We&rsquo;ll send you a 6-digit code to confirm it&rsquo;s you.</p>
        <form action="/api/auth/forgot-password" method="post">
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
          <button className="btn" type="submit">Send me a code</button>
        </form>
        <p>Already have a code? <Link href="/reset-password">Enter it here</Link></p>
        <p><Link href="/login">Back to login</Link></p>
      </main>
    </>
  );
}
