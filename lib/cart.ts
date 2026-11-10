import { orderableProducts } from "./order-request";

export const CART_COOKIE = "oria_cart";
const MAX_LINES = 30;
const MAX_QUANTITY = 10_000;

export type CartLine = { slug: string; quantity: number };

const known = new Map(orderableProducts.map((p) => [p.slug, p]));

function cleanQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(n, MAX_QUANTITY)) : 0;
}

/** Reads the basket cookie. Anything unknown or malformed is dropped, so a tampered cookie can't add odd items. */
export function parseCart(raw: string | undefined): CartLine[] {
  let data: unknown;
  try { data = JSON.parse(decodeURIComponent(raw ?? "[]")); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const lines = new Map<string, number>();
  for (const entry of data.slice(0, MAX_LINES)) {
    const slug = String((entry as CartLine)?.slug ?? "");
    const quantity = cleanQuantity((entry as CartLine)?.quantity);
    if (known.has(slug) && quantity > 0) lines.set(slug, Math.min(MAX_QUANTITY, (lines.get(slug) ?? 0) + quantity));
  }
  return [...lines].map(([slug, quantity]) => ({ slug, quantity }));
}

export function serializeCart(lines: CartLine[]): string {
  return encodeURIComponent(JSON.stringify(lines));
}

export type CartAction = "add" | "set" | "remove" | "clear";

export function updateCart(lines: CartLine[], action: CartAction, slug: string, quantity: unknown): CartLine[] {
  if (action === "clear") return [];
  if (!known.has(slug)) return lines;
  const others = lines.filter((l) => l.slug !== slug);
  const current = lines.find((l) => l.slug === slug)?.quantity ?? 0;
  const amount = cleanQuantity(quantity);
  const next = action === "add" ? current + Math.max(1, amount) : action === "set" ? amount : 0;
  const capped = Math.min(next, MAX_QUANTITY);
  return capped > 0 ? [...others, { slug, quantity: capped }].slice(0, MAX_LINES) : others;
}

export function cartDetails(lines: CartLine[]) {
  const items = lines.flatMap((line) => {
    const p = known.get(line.slug);
    return p ? [{ slug: p.slug, name: p.name, icon: p.icon, quantity: line.quantity, unitPrice: p.price, lineTotal: p.price * line.quantity }] : [];
  });
  return { items, total: items.reduce((sum, i) => sum + i.lineTotal, 0), count: items.reduce((sum, i) => sum + i.quantity, 0) };
}
