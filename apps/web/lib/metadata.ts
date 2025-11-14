import { locales, type Locale } from "./i18n/config";

import type { Metadata } from "next";


const fallbackSiteUrl = "http://localhost:3000";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl;
export const metadataBase = new URL(siteUrl);

const defaultTitle = "Junior UA";
const defaultDescription = "Jobs and events for juniors in Ukraine";
const defaultOgImageUrl = new URL("og-default.svg", metadataBase).toString();

const openGraphLocales: Record<Locale, string> = {
  uk: "uk_UA",
  en: "en_US"
};

const baseOpenGraph: NonNullable<Metadata["openGraph"]> = {
  title: defaultTitle,
  description: defaultDescription,
  url: siteUrl,
  siteName: defaultTitle,
  locale: openGraphLocales.uk,
  images: [
    {
      url: defaultOgImageUrl,
      width: 1200,
      height: 630,
      alt: defaultTitle
    }
  ]
};

const baseTwitter: NonNullable<Metadata["twitter"]> = {
  card: "summary_large_image",
  title: defaultTitle,
  description: defaultDescription,
  images: [defaultOgImageUrl]
};

export const defaultMetadata: Metadata = {
  metadataBase,
  title: {
    default: defaultTitle,
    template: "%s | Junior UA"
  },
  description: defaultDescription,
  openGraph: baseOpenGraph,
  twitter: baseTwitter
};

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildLocalizedUrl(locale: Locale, normalizedPath: string): string {
  const relative = normalizedPath ? `${locale}/${normalizedPath}` : `${locale}`;
  return new URL(relative, metadataBase).toString();
}

export function createLanguageAlternates(path: string, currentLocale: Locale): NonNullable<Metadata["alternates"]> {
  const normalizedPath = normalizePath(path);
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, buildLocalizedUrl(locale, normalizedPath)])
  );
  return {
    canonical: languages[currentLocale],
    languages
  };
}

export function createPageMetadata({
  locale,
  path,
  title,
  description,
  imageUrl,
  openGraphOverrides,
  twitterOverrides
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  imageUrl?: string;
  openGraphOverrides?: Partial<Metadata["openGraph"]>;
  twitterOverrides?: Partial<Metadata["twitter"]>;
}): Metadata {
  const alternates = createLanguageAlternates(path, locale);
  const languages = (alternates.languages ?? {}) as Record<Locale, string>;
  const canonicalUrl = languages[locale] ?? buildLocalizedUrl(locale, normalizePath(path));
  const image = imageUrl ?? defaultOgImageUrl;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    ...baseOpenGraph,
    ...openGraphOverrides,
    title: openGraphOverrides?.title ?? title,
    description: openGraphOverrides?.description ?? description,
    url: openGraphOverrides?.url ?? canonicalUrl,
    images:
      openGraphOverrides?.images ?? [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
    locale: openGraphLocales[locale]
  };

  const twitter: NonNullable<Metadata["twitter"]> = {
    ...baseTwitter,
    ...twitterOverrides,
    title: twitterOverrides?.title ?? title,
    description: twitterOverrides?.description ?? description,
    images: twitterOverrides?.images ?? [image]
  };

  return {
    metadataBase,
    title,
    description,
    alternates,
    openGraph,
    twitter
  };
}

export const defaultSiteTitle = defaultTitle;
export const defaultSiteDescription = defaultDescription;
export const defaultOgImage = defaultOgImageUrl;
