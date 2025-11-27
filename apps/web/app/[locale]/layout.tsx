import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { LocaleEffect } from "../../components/common/LocaleEffect";
import { DevBanner } from "../../components/layout/DevBanner";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { isLocale, locales, type Locale } from "../../lib/i18n/config";
import { IntlProvider } from "../../lib/i18n/provider";
import { getMessagesForLocale } from "../../lib/i18n/server";

export async function generateStaticParams(): Promise<Array<{ locale: Locale }>> {
  return locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParamRaw } = await params;

  if (!isLocale(localeParamRaw)) {
    notFound();
  }

  const localeParam = localeParamRaw;
  const messages = await getMessagesForLocale(localeParam);

  return (
    <IntlProvider locale={localeParam} messages={messages}>
      <LocaleEffect locale={localeParam} />
      <div className="flex min-h-screen flex-col">
        <Header />
        <DevBanner />
        <main className="container flex-1 py-6">{children}</main>
        <Footer />
      </div>
    </IntlProvider>
  );
}
