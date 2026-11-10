import { products } from "@/data/products";
import { parseFutureDate } from "@/lib/dates";

export interface OrderItem { slug: string; name: string; quantity: number; indicativePrice: number }

export interface OrderRequest {
  name: string;
  email: string;
  phone: string;
  organization: string;
  items: OrderItem[];
  otherItems: string;
  fulfilment: "collect" | "delivery";
  deliveryLocation: string;
  preferredDate: string | null;
  notes: string;
}

/** Products that can be ordered with a quantity. Custom printing has its own quote form. */
export const orderableProducts = products.filter((p) => p.slug !== "custom-printing");

const text = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

/** Reads the order form. Returns null with a reason when something required is missing. */
export function parseOrderForm(form: FormData): { order: OrderRequest } | { error: "required" | "items" | "delivery" } {
  const order: OrderRequest = {
    name: text(form, "name", 120),
    email: text(form, "email", 200).toLowerCase(),
    phone: text(form, "phone", 40),
    organization: text(form, "organization", 160),
    items: [],
    otherItems: text(form, "otherItems", 2000),
    fulfilment: form.get("fulfilment") === "delivery" ? "delivery" : "collect",
    deliveryLocation: text(form, "deliveryLocation", 300),
    preferredDate: parseFutureDate(form.get("preferredDate")),
    notes: text(form, "notes", 2000),
  };
  if (!order.name || !order.phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) return { error: "required" };

  for (const p of orderableProducts) {
    const quantity = Math.floor(Number(form.get(`qty-${p.slug}`) ?? 0));
    if (Number.isFinite(quantity) && quantity > 0) {
      order.items.push({ slug: p.slug, name: p.name, quantity: Math.min(quantity, 10_000), indicativePrice: p.price });
    }
  }
  if (order.items.length === 0 && !order.otherItems) return { error: "items" };
  if (order.fulfilment === "delivery" && !order.deliveryLocation) return { error: "delivery" };
  return { order };
}
