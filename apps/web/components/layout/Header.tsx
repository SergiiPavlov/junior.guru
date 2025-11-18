"use client";

import { Suspense } from "react";

import Link from "next/link";

import { useLocale, useTranslations } from "../../lib/i18n/provider";
import { LanguageSwitcher } from "../navigation/LanguageSwitcher";

export function Header() {
  const t = useTranslations("navigation");
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur shadow-sm">
      <div className="container flex items-center gap-6 py-3">
        <Link href={`/${locale}`} className="text-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
          Junior UA
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" href={`/${locale}`}>
            {t("home")}
          </Link>
          <Link className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" href={`/${locale}/jobs`}>
            {t("jobs")}
          </Link>
          <Link className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" href={`/${locale}/events`}>
            {t("events")}
          </Link>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="min-w-[44px] rounded-full bg-gray-200 px-4 py-2" aria-hidden="true" />}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
