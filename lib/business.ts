// The shop's own details, from Oria. Change them here and they update across the site.

export const PHONES = [
  { display: "0711 983 880", tel: "+254711983880" },
  { display: "0780 983 880", tel: "+254780983880" },
];

export const LOCATION = "Temple Road, opposite the Governor's gate, next to Tulwet Farmers, Kericho";

export const PAYBILL = "679013";

export const PAYMENT_METHODS = ["Cash", "Cheque", `M-Pesa Paybill ${PAYBILL}`];

export const SERVICES = [
  { icon: "📝", title: "Exams & assessment", text: "Exam and assessment materials for schools and individuals." },
  { icon: "🎓", title: "Graduation gown hire", text: "Gowns for school and college graduation ceremonies." },
  { icon: "📜", title: "Certificate printing", text: "Certificates printed for schools, events and organisations." },
  { icon: "🗂️", title: "Lamination & photocopying", text: "From single pages to bulk jobs." },
  { icon: "🌱", title: "Supergro organic fertiliser", text: "Organic fertiliser for farmers and gardeners." },
  { icon: "🖇️", title: "Office stationery", text: "Stationery for offices, schools and individuals." },
];

/** The short reference customers use as the Paybill account number. It's also shown on their M-Pesa prompt. */
export function paymentReference(id: string): string {
  return `ORIA${id.slice(-6).toUpperCase()}`;
}
