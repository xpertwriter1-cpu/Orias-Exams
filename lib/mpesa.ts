// Safaricom Daraja "M-Pesa Express" (the payment prompt sent to the customer's phone).

export interface MpesaConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  partyB: string;
  sandbox: boolean;
}

/** Null until all the Safaricom settings are filled in. Uses the test system unless MPESA_ENV is "production". */
export function mpesaConfig(): MpesaConfig | null {
  const env = process.env;
  const consumerKey = env.MPESA_CONSUMER_KEY?.trim();
  const consumerSecret = env.MPESA_CONSUMER_SECRET?.trim();
  const shortcode = env.MPESA_SHORTCODE?.trim();
  const passkey = env.MPESA_PASSKEY?.trim();
  if (!consumerKey || !consumerSecret || !shortcode || !passkey) return null;
  const sandbox = env.MPESA_ENV?.trim() !== "production";
  const till = env.MPESA_TYPE?.trim() === "till";
  return {
    baseUrl: sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke",
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    transactionType: till ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    // For a till, the prompt pays the till number; for a paybill, the paybill itself.
    partyB: (till ? env.MPESA_TILL_NUMBER?.trim() : undefined) || shortcode,
    sandbox,
  };
}

/** Turns 07…, 01…, +2547… or 2541… into 2547XXXXXXXX / 2541XXXXXXXX. Null if it isn't a Kenyan mobile number. */
export function normaliseMpesaPhone(input: unknown): string | null {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) digits = `254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) digits = `254${digits}`;
  return /^254[17]\d{8}$/.test(digits) ? digits : null;
}

/** Safaricom expects Kenya time, YYYYMMDDHHmmss. */
export function darajaTimestamp(now = new Date()): string {
  return new Date(now.getTime() + 3 * 3_600_000).toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

export function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

let cachedToken: { value: string; expiresAt: number; key: string } | null = null;

async function accessToken(cfg: MpesaConfig): Promise<string> {
  if (cachedToken && cachedToken.key === cfg.consumerKey && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64")}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`M-Pesa sign-in failed (HTTP ${res.status})`);
  const data = (await res.json()) as { access_token?: string; expires_in?: string | number };
  if (!data.access_token) throw new Error("M-Pesa sign-in returned no token");
  cachedToken = { value: data.access_token, key: cfg.consumerKey, expiresAt: Date.now() + (Number(data.expires_in ?? 3599) - 60) * 1000 };
  return data.access_token;
}

export function clearMpesaTokenCache() {
  cachedToken = null;
}

export type StkPushResult = { ok: true; checkoutRequestId: string; merchantRequestId: string } | { ok: false; message: string };

export async function stkPush(cfg: MpesaConfig, input: { phone: string; amount: number; accountReference: string; description: string; callbackUrl: string }): Promise<StkPushResult> {
  const timestamp = darajaTimestamp();
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(cfg)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: stkPassword(cfg.shortcode, cfg.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: cfg.transactionType,
      Amount: Math.round(input.amount),
      PartyA: input.phone,
      PartyB: cfg.partyB,
      PhoneNumber: input.phone,
      CallBackURL: input.callbackUrl,
      AccountReference: input.accountReference.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "ORIA",
      TransactionDesc: input.description.slice(0, 13),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (res.ok && String(data.ResponseCode) === "0" && data.CheckoutRequestID) {
    return { ok: true, checkoutRequestId: data.CheckoutRequestID, merchantRequestId: String(data.MerchantRequestID ?? "") };
  }
  return { ok: false, message: String(data.errorMessage ?? data.ResponseDescription ?? data.CustomerMessage ?? `HTTP ${res.status}`).slice(0, 200) };
}

/** Asks Safaricom how a prompt ended. resultCode is null while it's still being processed or the check failed. */
export async function stkQuery(cfg: MpesaConfig, checkoutRequestId: string): Promise<{ resultCode: string | null; resultDesc: string }> {
  const timestamp = darajaTimestamp();
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(cfg)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ BusinessShortCode: cfg.shortcode, Password: stkPassword(cfg.shortcode, cfg.passkey, timestamp), Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
    signal: AbortSignal.timeout(20000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (res.ok && data.ResultCode !== undefined) return { resultCode: String(data.ResultCode), resultDesc: String(data.ResultDesc ?? "") };
  return { resultCode: null, resultDesc: String(data.errorMessage ?? `HTTP ${res.status}`) };
}

export interface StkCallback {
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: string;
  resultDesc: string;
  amount: number | null;
  receipt: string | null;
  phone: string | null;
}

/** Reads Safaricom's result message. Returns null if it isn't shaped like one. */
export function parseStkCallback(body: unknown): StkCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string" || cb.ResultCode === undefined) return null;
  const items = Array.isArray((cb.CallbackMetadata as { Item?: unknown })?.Item) ? (cb.CallbackMetadata as { Item: { Name?: string; Value?: unknown }[] }).Item : [];
  const value = (name: string) => items.find((i) => i?.Name === name)?.Value;
  const amount = Number(value("Amount"));
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: String(cb.MerchantRequestID ?? ""),
    resultCode: String(cb.ResultCode),
    resultDesc: String(cb.ResultDesc ?? "").slice(0, 200),
    amount: Number.isFinite(amount) ? amount : null,
    receipt: value("MpesaReceiptNumber") ? String(value("MpesaReceiptNumber")).slice(0, 40) : null,
    phone: value("PhoneNumber") ? String(value("PhoneNumber")) : null,
  };
}
