import { getPublicStoreSettings } from "@/lib/store-settings/server";
import type { Metadata } from "next";

import { getSiteUrl } from "@/lib/seo";
import { storeMetadata } from "@/lib/config/store";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getPublicStoreSettings();
  return {
    metadataBase: getSiteUrl(),
    ...storeMetadata(store),
  };
}

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
