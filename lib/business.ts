// The shop's own details, from Oria. Change them here and they update across the site.

export const PHONES = [
  { display: "0711 983 880", tel: "+254711983880" },
  { display: "0780 983 880", tel: "+254780983880" },
];

export const LOCATION = "Temple Road, opposite the Governor's gate, next to Tulwet Farmers, Kericho";

export const PAYBILL = "679013";

export const WHATSAPP_GROUP = "https://chat.whatsapp.com/JgdM78A0LepKPAeh3cdqto";

export const DELIVERY_AREA = "all counties in Kenya";

export const PAYMENT_METHODS = ["Cash", "Cheque", `M-Pesa Paybill ${PAYBILL}`];

export const SERVICES = [
  { icon: "📝", title: "Exams & assessment", text: "For primary and secondary schools, and individuals." },
  { icon: "🎓", title: "Graduation gown hire", text: "Gowns for PP2, Grade 3, Grade 6 and Grade 9 graduations." },
  { icon: "📜", title: "Certificates for graduates", text: "Graduation certificates, with free lamination." },
  { icon: "🗂️", title: "Photocopying & lamination", text: "We also offer photocopying and lamination, from single pages to bulk jobs." },
  { icon: "🌱", title: "Supergro organic fertiliser", text: "Organic fertiliser for farmers and gardeners." },
  { icon: "🖇️", title: "Office stationery", text: "Stationery for offices, schools and individuals." },
  { icon: "🚚", title: "Countrywide delivery", text: "We deliver to all counties in Kenya." },
  { icon: "📱", title: "Loyalty rewards", text: "Earn 1 point per KES 1 spent. Get a phone at 850 points." },
];

/** The short reference customers use as the Paybill account number. It's also shown on their M-Pesa prompt. */
export function paymentReference(id: string): string {
  return `ORIA${id.slice(-6).toUpperCase()}`;
}
