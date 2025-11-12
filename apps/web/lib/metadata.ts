import type { Metadata } from "next";
import { locales, type Locale } from "./i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function createLanguageAlternates(path: string, currentLocale: Locale): Metadata["alternates"] {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${siteUrl}/${locale}${normalizedPath}`])
  );
  return {
    canonical: `${siteUrl}/${currentLocale}${normalizedPath}`,
    languages
  };
}
