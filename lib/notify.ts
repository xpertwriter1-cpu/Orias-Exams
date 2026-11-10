/** Where new order and printing requests are emailed. Set ADMIN_EMAIL to an inbox you check. */
export function notifyAddress(): string {
  return process.env.ADMIN_EMAIL?.trim() || "admin@oriaexamsupplies.co.ke";
}
