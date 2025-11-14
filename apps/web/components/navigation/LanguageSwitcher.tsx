"use client";

import { useCallback } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { locales, type Locale } from "../../lib/i18n/config";
import { useLocale, useTranslations } from "../../lib/i18n/provider";


function buildHref(locale: Locale, pathname: string, searchParams: URLSearchParams) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const localePattern = new RegExp(`^/(${locales.join("|")})(?=/|$)`);
  const pathWithoutLocale = normalizedPath.replace(localePattern, "") || "/";
  const cleanPath = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
  const queryString = searchParams.toString();
  const href = `/${locale}${cleanPath}`;
  return queryString ? `${href}?${queryString}` : href;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (next: Locale) => {
      const href = buildHref(next, pathname ?? "/", new URLSearchParams(searchParams));
      router.push(href);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex items-center gap-2" aria-label={t("label")}>
      <span className="text-sm text-gray-500">{t("label")}</span>
      <div className="flex gap-1" role="group" aria-label={t("label")}>
        {locales.map((code) => {
          const isActive = code === locale;
          return (
            <button
              key={code}
              type="button"
              onClick={() => handleChange(code)}
              className={`min-w-[44px] rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                isActive ? "bg-black text-white" : "border border-black/20 bg-white text-black"
              }`}
              aria-pressed={isActive}
            >
              {code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
