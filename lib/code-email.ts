import { CODE_MINUTES, type CodePurpose, type SendCode } from "./email-codes";

const WORDING: Record<CodePurpose, { subject: string; action: string; ignore: string }> = {
  "password-reset": {
    subject: "Your Oria Exam Supplies password code",
    action: "change your password",
    ignore: "If you did not ask to change your password, ignore this email. Your password stays the same.",
  },
  "admin-login": {
    subject: "Your Oria Exam Supplies admin sign-in code",
    action: "sign in to the admin dashboard",
    ignore: "If you did not try to sign in, ignore this email and nobody can get in without it.",
  },
};

export function codeEmailSender(purpose: CodePurpose): SendCode {
  return async (to, code, requestId) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) throw new Error("Email sending is not configured");
    const wording = WORDING[purpose];
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${purpose}/${requestId}` },
      body: JSON.stringify({
        from,
        to: [to],
        subject: wording.subject,
        text: [
          `Your code to ${wording.action} is: ${code}`,
          "",
          `It works once and expires in ${CODE_MINUTES} minutes.`,
          wording.ignore,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.json().then((body: { message?: string }) => body.message ?? "").catch(() => "");
      throw new Error(`Email service returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }
  };
}
