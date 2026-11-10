const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Today's date in Kenya as YYYY-MM-DD. */
export function todayInKenya(now = new Date()): string {
  return new Date(now.getTime() + KENYA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Accepts a real calendar date (YYYY-MM-DD) from today onwards. Anything else gives null. */
export function parseFutureDate(value: unknown, now = new Date()): string | null {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return null;
  return text >= todayInKenya(now) ? text : null;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}
