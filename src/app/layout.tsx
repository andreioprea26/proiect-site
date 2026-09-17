import { getPublicStoreSettings } from "@/lib/store-settings/server";
import type { Metadata } from "next";

import { getSiteUrl } from "@/lib/seo";
import { STORE_CONFIG, storeMetadata } from "@/lib/config/store";
import { themeVariables } from "@/lib/config/theme";

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
    <html lang="ro" style={themeVariables(STORE_CONFIG.theme)}>
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
