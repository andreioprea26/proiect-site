import type { Metadata } from "next";

import { getSiteUrl } from "@/lib/seo";
import { storeMetadata } from "@/lib/config/store";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  ...storeMetadata(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body>
        <a className="skip-link" href="#main-content">
          Sari la conținut
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
