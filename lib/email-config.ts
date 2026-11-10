/**
 * True once Resend is set up. Until then admins sign in with their password;
 * after that, only an emailed code opens the admin dashboard.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}
