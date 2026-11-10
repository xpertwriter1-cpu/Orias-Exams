import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Oria Exam Supplies | Educational Resources",
  description: "Exam papers, mock examinations, revision materials and printing services in Kericho, Kenya."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}