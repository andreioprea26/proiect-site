import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brand Handmade",
  description: "Magazin online pentru produse handmade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
