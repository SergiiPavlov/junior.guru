import { isLocale } from "../../../lib/i18n/config";
import { getTranslator } from "../../../lib/i18n/server";
import { createPageMetadata, defaultMetadata } from "../../../lib/metadata";

import type { Metadata } from "next";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return defaultMetadata;
  }
  const [tPage, tMeta] = await Promise.all([
    getTranslator(locale, "about"),
    getTranslator(locale, "meta")
  ]);
  return createPageMetadata({
    locale,
    path: "/about",
    title: tPage("title"),
    description: tMeta("description")
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale");
  }
  const t = await getTranslator(locale, "about");
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-lg text-gray-600">{t("intro")}</p>
      </header>
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">{t("sectionMissionTitle")}</h2>
        <p>{t("sectionMissionBody")}</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">{t("sectionAudienceTitle")}</h2>
        <p>{t("sectionAudienceBody")}</p>
      </section>
    </article>
  );
}
