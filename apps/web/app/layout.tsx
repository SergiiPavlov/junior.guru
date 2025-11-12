import type { Metadata } from "next";
import "./globals.css";

import { defaultLocale } from "../lib/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Junior UA",
    template: "%s | Junior UA"
  },
  description: "Jobs and events for juniors in Ukraine"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black antialiased">{children}</body>
    </html>
  );
}
