"use client";

import Link from "next/link";

import { useLocale, useTranslations } from "../../lib/i18n/provider";

export function Footer() {
  const tFooter = useTranslations("footer");
  const tNav = useTranslations("navigation");
  const year = new Date().getFullYear();
  const locale = useLocale();

  return (
    <footer className="border-t bg-white">
      <div className="container flex flex-col gap-2 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div>{tFooter("copyright", { year: String(year) })}</div>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/privacy`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tNav("privacy")}
          </Link>
          <Link
            href={`/${locale}/terms`}
            className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            {tNav("terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
