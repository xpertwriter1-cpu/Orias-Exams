import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// On the live site a missing secret must stop sign-in, not fall back to a known value
// that would let anyone forge a session.
function getSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) return new TextEncoder().encode(configured);
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode("development-only-change-this-secret-please");
}
export async function createSession(user: { id: string; name: string; email: string; role: string }) {
  const token = await new SignJWT(user).setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime("7d").sign(getSecret());
  (await cookies()).set("oria_session", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7
  });
}
export async function getSession() {
  const token = (await cookies()).get("oria_session")?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, getSecret())).payload as { id: string; name: string; email: string; role: string }; }
  catch { return null; }
}
