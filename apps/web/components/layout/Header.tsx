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
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 text-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <img src="/logo-juy.svg" alt="" className="h-7 w-7" />
          </span>
          <span className="font-semibold">Junior UA</span>
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
