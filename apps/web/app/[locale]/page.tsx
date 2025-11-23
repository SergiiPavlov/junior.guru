import Image from "next/image";
import Link from "next/link";

import { isLocale } from "../../lib/i18n/config";
import { getTranslator } from "../../lib/i18n/server";
import { createPageMetadata, defaultMetadata } from "../../lib/metadata";

import type { Metadata } from "next";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return defaultMetadata;
  }

  const tMeta = await getTranslator(locale, "meta");

  return createPageMetadata({
    locale,
    path: "/",
    title: tMeta("title"),
    description: tMeta("description")
  });
}


export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }

  const tHome = await getTranslator(locale, "home");

  return (
    <main className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-start px-4 pt-16 sm:pt-20 lg:pt-24">
      <div className="flex w-full max-w-3xl flex-col items-center text-center space-y-6">
        <Image
          src="/logo-juy.svg"
          alt="Junior UA"
          width={160}
          height={160}
          className="mb-4"
          priority
        />

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
          {tHome("heroTitle")}
        </h1>

        <p className="text-base sm:text-lg text-gray-600">
          {tHome("heroSubtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/jobs`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full
                       bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white
                       shadow-sm hover:bg-[var(--accent-dark)]
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2
                       focus-visible:outline-[var(--accent)]"
          >
            {tHome("ctaJobs")}
          </Link>

          <Link
            href={`/${locale}/events`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full
                       border border-[var(--accent)] bg-white px-6 py-2
                       text-sm font-semibold text-[var(--accent)]
                       hover:bg-[var(--accent-soft)]
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2
                       focus-visible:outline-[var(--accent)]"
          >
            {tHome("ctaEvents")}
          </Link>
        </div>
      </div>
    </main>
  );
}

