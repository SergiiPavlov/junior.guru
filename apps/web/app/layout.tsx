import type { Metadata } from "next";

import "./globals.css";

import { defaultLocale } from "../lib/i18n/config";
import { defaultMetadata } from "../lib/metadata";

export const metadata: Metadata = defaultMetadata;
const __apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';
let __apiOrigin = __apiBase;
try { __apiOrigin = new URL(__apiBase).origin; } catch {}


import SkipToContent from '@/components/a11y/SkipToContent'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <head>
    <meta name="theme-color" content="#0ea5e9" />
    {/* preconnect to API */}
    <link rel="preconnect"
    <link rel="dns-prefetch" href={__apiOrigin} /> href={__apiOrigin} /></head>
  <body>
    <SkipToContent />
 className="min-h-screen bg-white text-black antialiased"><main id="main" role="main" tabIndex={-1}>{children}</main></body>
    </html>
  );
}
