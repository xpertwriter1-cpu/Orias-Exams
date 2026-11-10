import { PAYBILL } from "@/lib/business";

/** The shop's payment options, shown wherever customers shop or order. */
export default function PayNote() {
  return (
    <p className="paynote">💳 Pay by cash, cheque or M-Pesa Paybill <strong>{PAYBILL}</strong></p>
  );
}
