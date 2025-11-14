import { defaultLocale } from "../lib/i18n/config";
import { defaultMetadata } from "../lib/metadata";

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black antialiased">{children}</body>
    </html>
  );
}
