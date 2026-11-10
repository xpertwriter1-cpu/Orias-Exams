import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Oria Exam Supplies | Educational Resources",
  description: "Wholesale and retail exam and assessment materials, graduation gown hire, certificate printing, lamination, photocopying, office stationery and Supergro organic fertiliser in Kericho, Kenya."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}